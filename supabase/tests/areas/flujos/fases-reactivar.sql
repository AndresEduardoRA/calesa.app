-- Reactivar una fase jubilada (paso 5.01-2): permiso, versión del flujo y reglas del flujo. No depende de otro archivo
-- (`SOLO=humo.sql,areas/flujos/fases-reactivar.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. El asesor y quien configura OTRO origen reciben 42501 y la fase sigue jubilada con la misma versión; `repuestos.configurar` reactiva en
--       repuestos y no en A; versión vieja → PT409.
--   A2. Jubilada → activa y devuelve la versión del flujo; ya activa → 22023; con `es_logistica` y la regla `logistica` apagada → 23514 con hint
--       `es_logistica` y sigue jubilada (ese estado sólo se alcanza por escritura directa: el trigger de las reglas cuenta también las jubiladas).

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.fr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fr_' || substr(v_id::text, 1, 8), 'FR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fr_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo, sin fases, lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.fr_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fr_' || s, 'FR origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fr_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fr_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

-- Una fase escrita como `postgres`, con su orden.
create or replace function pg_temp.fr_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

create or replace function pg_temp.fr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fr_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

create or replace function pg_temp.fr_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

create or replace function pg_temp.fr_reactivar(p_quien uuid, p_fase uuid, p_version timestamptz) returns jsonb language sql as $f$
  select pg_temp.fr_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_reactivar(%L, %L))', p_fase, p_version));
$f$;

create or replace function pg_temp.fr_activa(p_fase uuid) returns boolean language sql as $f$
  select activa from public.fases where id = p_fase;
$f$;

-- @test fases: fase_reactivar da 42501 al asesor y a quien configura otro origen, PT409 con la versión vieja; repuestos.configurar reactiva sólo en repuestos (A1)
begin;
do $$
declare
  a uuid := pg_temp.fr_flujo(); b uuid := pg_temp.fr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_a uuid := pg_temp.fr_persona(array['flujos.configurar@' || pg_temp.fr_origen_de(a)]);
  config_b uuid := pg_temp.fr_persona(array['flujos.configurar@' || pg_temp.fr_origen_de(b)]);
  config_rep uuid := pg_temp.fr_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.fr_asesor();
  f uuid := pg_temp.fr_fase(a, 'FR uno', 10, false); fr uuid := pg_temp.fr_fase(rep, 'FR rep', 1000, false);
  va timestamptz := pg_temp.fr_version(a); r jsonb;
begin
  r := pg_temp.fr_reactivar(asesor, f, va);
  perform pg_temp.fr_da_error('A1 asesor', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fr_reactivar(config_b, f, va);
  perform pg_temp.fr_da_error('A1 otro origen', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fr_reactivar(config_rep, f, va);
  perform pg_temp.fr_da_error('A1 repuestos en A', r, '42501', 'No tienes permiso para configurar este flujo.');
  perform public._flujo_tocar(a);
  r := pg_temp.fr_reactivar(config_a, f, va);
  perform pg_temp.fr_da_error('A1 vieja', r, 'PT409', 'Otra persona cambió este flujo mientras lo editabas.');
  if pg_temp.fr_activa(f) then raise exception 'A1: un error reactivó la fase'; end if;
  r := pg_temp.fr_reactivar(config_rep, fr, pg_temp.fr_version(rep));
  if r ? 'error' or not pg_temp.fr_activa(fr) then raise exception 'A1: repuestos.configurar debía reactivar en repuestos y dio %', r; end if;
end $$;
rollback;

-- @test fases: fase_reactivar deja activa la fase y devuelve la versión; ya activa 22023; una regla apagada 23514 con hint y sigue jubilada (A2)
begin;
do $$
declare
  a uuid := pg_temp.fr_flujo();
  config_a uuid := pg_temp.fr_persona(array['flujos.configurar@' || pg_temp.fr_origen_de(a)]);
  f uuid := pg_temp.fr_fase(a, 'FR uno', 10, false); g uuid := pg_temp.fr_fase(a, 'FR logística', 20, false);
  v0 timestamptz := pg_temp.fr_version(a); v1 timestamptz; r jsonb;
begin
  r := pg_temp.fr_reactivar(config_a, f, v0);
  if r ? 'error' then raise exception 'A2: debía reactivar y dio %', r; end if;
  v1 := (r ->> 'version')::timestamptz;
  if not (pg_temp.fr_activa(f) and v1 > v0 and v1 = pg_temp.fr_version(a)) then raise exception 'A2: no quedó activa o la versión % no es la del flujo', v1; end if;
  r := pg_temp.fr_reactivar(config_a, f, v1);
  perform pg_temp.fr_da_error('A2 ya activa', r, '22023', 'Esta fase ya está activa.');
  alter table public.flujos_reglas disable trigger trg_flujo_regla_apagar_validar;
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'logistica';
  alter table public.flujos_reglas enable trigger trg_flujo_regla_apagar_validar;
  r := pg_temp.fr_reactivar(config_a, g, pg_temp.fr_version(a));
  perform pg_temp.fr_da_error('A2 regla apagada', r, '23514', 'La logística está apagada en este flujo.');
  if r ->> 'hint' is distinct from 'es_logistica' then raise exception 'A2: el hint debía ser es_logistica y dio %', r; end if;
  if pg_temp.fr_activa(g) then raise exception 'A2: con la regla apagada la fase quedó activa'; end if;
end $$;
rollback;
