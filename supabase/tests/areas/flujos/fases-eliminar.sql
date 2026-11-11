-- Eliminar una fase (paso 5.01-2): `fase_eliminar(p_fase, p_actualizado_en_esperado)` con la regla de `_fase_uso()`. No depende de otro archivo
-- (`SOLO=humo.sql,areas/flujos/fases-eliminar.sql`). Cada bloque abre su transacción y la revierte. El impacto: `fases-impacto.sql`.
--
-- Qué asegura:
--   E1. El asesor y quien configura OTRO origen reciben 42501 y nada cambia (la fase ni la versión); `repuestos.configurar` elimina en repuestos y no en A.
--   E3. Sin historial borra: `{accion: eliminada, version}` con la versión del flujo, y sus transiciones se van en cascada.
--   E4. Con historial jubila (`activa = false`) y la fase deja de ser destino: `previsualizar_cambio_fase` dice «La fase destino está jubilada.».
--   E5. Una espera → 23503; la única inicial activa sin historial → 23514 (hint `es_inicial`); con historial se jubila; ya jubilada con uso → 22023.
--   E6. Versión vieja → PT409 sin tocar la fase; la firma vieja `fase_eliminar(uuid)` ya no existe.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.fe_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fe_' || substr(v_id::text, 1, 8), 'FE ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fe_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo, sin fases, lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.fe_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fe_' || s, 'FE origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fe_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fe_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

-- Una fase escrita como `postgres`, con su orden.
create or replace function pg_temp.fe_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

create or replace function pg_temp.fe_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fe_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

create or replace function pg_temp.fe_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

create or replace function pg_temp.fe_eliminar(p_quien uuid, p_fase uuid, p_version timestamptz) returns jsonb language sql as $f$
  select pg_temp.fe_corre(p_quien, format('select public.fase_eliminar(%L, %L)', p_fase, p_version));
$f$;

-- Un vehículo del origen del flujo, sin fase, con una vuelta por esa fase en su historial (como `postgres`).
create or replace function pg_temp.fe_historial(p_flujo uuid, p_fase uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo) values (pg_temp.fe_origen_de(p_flujo), 'FE vehículo') returning id into v;
  insert into public.historial_fases (flujo_id, vehiculo_id, a_fase_id) values (p_flujo, v, p_fase);
  return v;
end $f$;

-- @test fases: fase_eliminar da 42501 al asesor y a quien configura otro origen; repuestos.configurar elimina sólo en repuestos (E1)
begin;
do $$
declare
  a uuid := pg_temp.fe_flujo(); b uuid := pg_temp.fe_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_b uuid := pg_temp.fe_persona(array['flujos.configurar@' || pg_temp.fe_origen_de(b)]);
  config_rep uuid := pg_temp.fe_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.fe_asesor();
  f uuid := pg_temp.fe_fase(a, 'FE uno', 10); fr uuid := pg_temp.fe_fase(rep, 'FE rep', 1000);
  va timestamptz := pg_temp.fe_version(a); r jsonb;
begin
  r := pg_temp.fe_eliminar(asesor, f, va);
  perform pg_temp.fe_da_error('E1 asesor', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fe_eliminar(config_b, f, va);
  perform pg_temp.fe_da_error('E1 otro origen', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fe_eliminar(config_rep, f, va);
  perform pg_temp.fe_da_error('E1 repuestos en A', r, '42501', 'No tienes permiso para configurar este flujo.');
  if not exists (select 1 from public.fases where id = f and activa) or pg_temp.fe_version(a) is distinct from va then
    raise exception 'E1: un 42501 tocó la fase o movió la versión';
  end if;
  r := pg_temp.fe_eliminar(config_rep, fr, pg_temp.fe_version(rep));
  if r ->> 'accion' is distinct from 'eliminada' or exists (select 1 from public.fases where id = fr) then
    raise exception 'E1: repuestos.configurar debía eliminar en repuestos y dio %', r;
  end if;
end $$;
rollback;

-- @test fases: fase_eliminar sin historial borra la fase y sus transiciones, y devuelve la versión del flujo (E3)
begin;
do $$
declare
  a uuid := pg_temp.fe_flujo();
  config_a uuid := pg_temp.fe_persona(array['flujos.configurar@' || pg_temp.fe_origen_de(a)]);
  f uuid := pg_temp.fe_fase(a, 'FE uno', 10); g uuid := pg_temp.fe_fase(a, 'FE dos', 20);
  v0 timestamptz := pg_temp.fe_version(a); r jsonb;
begin
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (a, f, g), (a, g, f);
  r := pg_temp.fe_eliminar(config_a, f, v0);
  if r ? 'error' or (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['accion', 'version']
     or r ->> 'accion' is distinct from 'eliminada' then
    raise exception 'E3: debía dar {accion: eliminada, version} y dio %', r;
  end if;
  if (r ->> 'version')::timestamptz is distinct from pg_temp.fe_version(a) or not pg_temp.fe_version(a) > v0 then
    raise exception 'E3: la versión devuelta % no es la del flujo %', r ->> 'version', pg_temp.fe_version(a);
  end if;
  if exists (select 1 from public.fases where id = f) or exists (select 1 from public.fases_transiciones where f in (de_fase_id, a_fase_id)) then
    raise exception 'E3: la fase o sus transiciones siguen';
  end if;
end $$;
rollback;

-- @test fases: fase_eliminar con historial jubila y la fase deja de ser destino (E4)
begin;
do $$
declare
  a uuid := pg_temp.fe_flujo();
  config_a uuid := pg_temp.fe_persona(array['flujos.configurar@' || pg_temp.fe_origen_de(a)]);
  logistica uuid := pg_temp.fe_persona(array['logistica.ver']);
  f uuid := pg_temp.fe_fase(a, 'FE uno', 10); r jsonb; veh uuid;
begin
  veh := pg_temp.fe_historial(a, f);
  r := pg_temp.fe_eliminar(config_a, f, pg_temp.fe_version(a));
  if r ->> 'accion' is distinct from 'jubilada' or (r ->> 'version')::timestamptz is distinct from pg_temp.fe_version(a) then
    raise exception 'E4: debía jubilar y dio %', r;
  end if;
  if (select activa from public.fases where id = f) then raise exception 'E4: la fase sigue activa'; end if;
  r := pg_temp.fe_corre(logistica, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, f));
  if not coalesce(r -> 'motivos' ? 'La fase destino está jubilada.', false) then
    raise exception 'E4: previsualizar_cambio_fase debía decir «jubilada» y dio %', r;
  end if;
end $$;
rollback;

-- @test fases: fase_eliminar da 23503 con una espera, 23514 a la única inicial sin historial, jubila la única inicial con historial y 22023 a una ya jubilada (E5)
begin;
do $$
declare
  a uuid := pg_temp.fe_flujo(); c uuid := pg_temp.fe_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.fe_persona(array['flujos.configurar']);
  esperada uuid := pg_temp.fe_fase(a, 'FE esperada', 10); inicial uuid := pg_temp.fe_fase(a, 'FE inicial', 20);
  inicial_c uuid := pg_temp.fe_fase(c, 'FE inicial c', 10); fr uuid := pg_temp.fe_fase(rep, 'FE de repuestos', 1000); r jsonb;
begin
  update public.fases set es_inicial = true where id in (inicial, inicial_c);
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (fr, 'espera', esperada, 'padre');
  r := pg_temp.fe_eliminar(config, esperada, pg_temp.fe_version(a));
  perform pg_temp.fe_da_error('E5 espera', r, '23503', 'Hay requisitos que esperan a esta fase. Quítalos antes de eliminarla.');
  r := pg_temp.fe_eliminar(config, inicial, pg_temp.fe_version(a));
  perform pg_temp.fe_da_error('E5 única inicial', r, '23514', 'Es la única fase inicial del flujo: marca otra como inicial antes de eliminarla.');
  if r ->> 'hint' is distinct from 'es_inicial' then raise exception 'E5: el hint debía ser es_inicial y dio %', r; end if;
  if (select count(*) from public.fases where id in (esperada, inicial) and activa) <> 2 then raise exception 'E5: un error tocó una fase'; end if;
  perform pg_temp.fe_historial(c, inicial_c);
  r := pg_temp.fe_eliminar(config, inicial_c, pg_temp.fe_version(c));
  if r ->> 'accion' is distinct from 'jubilada' then raise exception 'E5: la única inicial con historial debía jubilarse y dio %', r; end if;
  r := pg_temp.fe_eliminar(config, inicial_c, pg_temp.fe_version(c));
  perform pg_temp.fe_da_error('E5 ya jubilada', r, '22023', 'Esta fase ya está jubilada.');
end $$;
rollback;

-- @test fases: fase_eliminar con la versión vieja da PT409 sin tocar la fase, y la firma vieja ya no existe (E6)
begin;
do $$
declare
  a uuid := pg_temp.fe_flujo();
  config_a uuid := pg_temp.fe_persona(array['flujos.configurar@' || pg_temp.fe_origen_de(a)]);
  f uuid := pg_temp.fe_fase(a, 'FE uno', 10); v0 timestamptz := pg_temp.fe_version(a); r jsonb;
begin
  perform public._flujo_tocar(a);
  r := pg_temp.fe_eliminar(config_a, f, v0);
  perform pg_temp.fe_da_error('E6 vieja', r, 'PT409', 'Otra persona cambió este flujo mientras lo editabas.');
  if not exists (select 1 from public.fases where id = f and activa) then raise exception 'E6: un PT409 tocó la fase'; end if;
  if to_regprocedure('public.fase_eliminar(uuid)') is not null then raise exception 'E6: la firma vieja sigue'; end if;
end $$;
rollback;
