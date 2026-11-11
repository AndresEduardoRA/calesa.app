-- La base de «Fases» (paso 5.01-1): la versión del flujo, el contrato para editarlo y las RPC de fase sin escritura directa. No depende de otro
-- archivo (`SOLO=humo.sql,areas/flujos/fases.sql`). Cada bloque abre su transacción y la revierte. Lista cerrada, tipos, validaciones, reglas y
-- únicos: `fases-guardar.sql`; la carrera: `carreras.mjs`.
--
-- Qué asegura:
--   V1. `_flujo_tocar()` dos veces en una transacción da versiones distintas y crecientes; `authenticated` no ejecuta ni `_flujo_para_editar` ni `_flujo_tocar`.
--   V2. `_flujo_para_editar()`: inexistente → PT409; sin permiso → 42501; versión vieja → PT409; buena → la fila.
--   V3. `fase_crear` y `fase_guardar`: el asesor y quien configura OTRO origen reciben 42501 y nada se escribe.
--   V4. `flujos.configurar` de A crea y guarda en A y no en repuestos; `repuestos.configurar` crea y guarda en repuestos y no en A.
--   V5. La versión: crear y guardar devuelven `flujos.actualizado_en`; guardar con la vieja → PT409 sin escribir; sin versión → error sin escribir.
--   V6. `fase_crear` deja la fase al final (`orden` = máximo + 10) y activa; un id repetido → 23505 con hint `id`.
--   V7. `authenticated` no escribe directo `fases` ni `flujos` (42501) y las policies de escritura ya no existen.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.ff_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ff_' || substr(v_id::text, 1, 8), 'FF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Una persona con el rol `asesor` de la semilla.
create or replace function pg_temp.ff_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.ff_flujo(p_tipo text) returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('ff_' || s, 'FF origen ' || s, p_tipo::public.tipo_origen) returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.ff_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.ff_repuestos() returns uuid language sql as $f$
  select id from public.flujos where ambito = 'repuestos';
$f$;

create or replace function pg_temp.ff_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.ff_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Lo mismo, pero como `postgres` con los claims de esa persona (para los ayudantes, que `authenticated` no ejecuta).
create or replace function pg_temp.ff_corre_como_dueno_de_la_base(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.ff_crear(p_quien uuid, p_id uuid, p_flujo uuid, p_version timestamptz, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.ff_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_crear(%L, %L, %L, %L::jsonb))', p_id, p_flujo, p_version, p_datos));
$f$;

create or replace function pg_temp.ff_guardar(p_quien uuid, p_fase uuid, p_version timestamptz, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.ff_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_guardar(%L, %L, %L::jsonb))', p_fase, p_version, p_cambios));
$f$;

-- Da ese error (sqlstate y mensaje exactos).
create or replace function pg_temp.ff_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

create or replace function pg_temp.ff_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- @test fases: la versión del flujo se mueve dos veces en una transacción y los ayudantes no son de authenticated (V1)
begin;
do $$
declare f uuid := pg_temp.ff_flujo('manual'); v0 timestamptz; v1 timestamptz; v2 timestamptz;
begin
  v0 := pg_temp.ff_version(f);
  v1 := public._flujo_tocar(f);
  v2 := public._flujo_tocar(f);
  if not (v1 > v0 and v2 > v1) then raise exception 'V1: la versión no avanzó: % → % → %', v0, v1, v2; end if;
  if v2 is distinct from pg_temp.ff_version(f) then raise exception 'V1: _flujo_tocar no devolvió la versión guardada'; end if;
  if has_function_privilege('authenticated', 'public._flujo_para_editar(uuid, timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public._flujo_tocar(uuid)', 'execute')
     or has_function_privilege('anon', 'public._flujo_tocar(uuid)', 'execute') then
    raise exception 'V1: authenticated o anon ejecutan un ayudante del contrato';
  end if;
end $$;
rollback;

-- @test fases: _flujo_para_editar da PT409 si no existe, 42501 sin permiso, PT409 con la versión vieja y la fila con la buena (V2)
begin;
do $$
declare
  f uuid := pg_temp.ff_flujo('manual'); otro uuid := pg_temp.ff_flujo('manual');
  config_a uuid := pg_temp.ff_persona(array['flujos.configurar@' || pg_temp.ff_origen_de(f)]);
  asesor uuid := pg_temp.ff_asesor();
  v timestamptz := pg_temp.ff_version(f);
  r jsonb;
begin
  r := pg_temp.ff_corre_como_dueno_de_la_base(config_a, format('select to_jsonb(public._flujo_para_editar(%L, %L))', gen_random_uuid(), v));
  perform pg_temp.ff_da_error('V2 inexistente', r, 'PT409', 'Este flujo ya no existe. Recarga e intenta de nuevo.');
  r := pg_temp.ff_corre_como_dueno_de_la_base(asesor, format('select to_jsonb(public._flujo_para_editar(%L, %L))', f, v));
  perform pg_temp.ff_da_error('V2 asesor', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.ff_corre_como_dueno_de_la_base(config_a, format('select to_jsonb(public._flujo_para_editar(%L, %L))', otro, pg_temp.ff_version(otro)));
  perform pg_temp.ff_da_error('V2 otro origen', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.ff_corre_como_dueno_de_la_base(config_a, format('select to_jsonb(public._flujo_para_editar(%L, %L))', f, v - interval '1 second'));
  perform pg_temp.ff_da_error('V2 vieja', r, 'PT409', 'Otra persona cambió este flujo mientras lo editabas.');
  r := pg_temp.ff_corre_como_dueno_de_la_base(config_a, format('select to_jsonb(public._flujo_para_editar(%L, %L))', f, v));
  if r ->> 'id' is distinct from f::text then raise exception 'V2 buena: debía devolver la fila y dio %', r; end if;
end $$;
rollback;
