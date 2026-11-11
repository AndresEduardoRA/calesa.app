-- Mover una fase (paso 5.01-2): permiso, versión del flujo y numeración de `orden` sin repetidos. No depende de otro archivo
-- (`SOLO=humo.sql,areas/flujos/fases-mover.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   M1. El asesor y quien configura OTRO origen reciben 42501 y ningún `orden` cambia ni la versión; `repuestos.configurar` mueve en repuestos y no en A.
--   M2. Mover renumera todo el flujo (también las jubiladas y las de `orden` repetido) de 10 en 10, sin dos iguales, y devuelve la versión nueva.
--   M3. Versión vieja → PT409 sin cambiar nada; tras sí misma → 22023 con hint `despues_de`; ancla de otro flujo → PT409.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.fm_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fm_' || substr(v_id::text, 1, 8), 'FM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fm_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo, sin fases, lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.fm_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fm_' || s, 'FM origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fm_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fm_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

-- Una fase escrita como `postgres`, con su orden.
create or replace function pg_temp.fm_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

-- Los nombres del flujo en su orden, y si hay `orden` repetido.
create or replace function pg_temp.fm_orden(p_flujo uuid) returns text language sql as $f$
  select string_agg(nombre || ':' || orden, ' ' order by orden, nombre) from public.fases where flujo_id = p_flujo;
$f$;

create or replace function pg_temp.fm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fm_mover(p_quien uuid, p_fase uuid, p_version timestamptz, p_despues_de uuid) returns jsonb language sql as $f$
  select pg_temp.fm_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_mover(%L, %L, %L))', p_fase, p_version, p_despues_de));
$f$;

create or replace function pg_temp.fm_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

create or replace function pg_temp.fm_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- @test fases: fase_mover da 42501 al asesor y a quien configura otro origen; repuestos.configurar mueve sólo en repuestos (M1)
begin;
do $$
declare
  a uuid := pg_temp.fm_flujo(); b uuid := pg_temp.fm_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_b uuid := pg_temp.fm_persona(array['flujos.configurar@' || pg_temp.fm_origen_de(b)]);
  config_rep uuid := pg_temp.fm_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.fm_asesor();
  f1 uuid := pg_temp.fm_fase(a, 'FM uno', 10); f2 uuid := pg_temp.fm_fase(a, 'FM dos', 20);
  r1 uuid := pg_temp.fm_fase(rep, 'FM rep uno', 1000); r2 uuid := pg_temp.fm_fase(rep, 'FM rep dos', 1010);
  va timestamptz := pg_temp.fm_version(a); antes text := pg_temp.fm_orden(a); r jsonb;
begin
  r := pg_temp.fm_mover(asesor, f2, va, null);
  perform pg_temp.fm_da_error('M1 asesor', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fm_mover(config_b, f2, va, null);
  perform pg_temp.fm_da_error('M1 otro origen', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fm_mover(config_rep, f2, va, null);
  perform pg_temp.fm_da_error('M1 repuestos en A', r, '42501', 'No tienes permiso para configurar este flujo.');
  if pg_temp.fm_orden(a) is distinct from antes or pg_temp.fm_version(a) is distinct from va then
    raise exception 'M1: un 42501 cambió el orden o la versión: % → %', antes, pg_temp.fm_orden(a);
  end if;
  perform pg_temp.fm_pasa('M1 repuestos en repuestos', pg_temp.fm_mover(config_rep, r2, pg_temp.fm_version(rep), null));
  if (select orden from public.fases where id = r2) >= (select orden from public.fases where id = r1) then
    raise exception 'M1: repuestos.configurar no dejó primera la fase movida: %', pg_temp.fm_orden(rep);
  end if;
end $$;
rollback;

-- @test fases: fase_mover renumera todo el flujo de 10 en 10, sin orden repetido, y devuelve la versión nueva (M2)
begin;
do $$
declare
  a uuid := pg_temp.fm_flujo();
  config_a uuid := pg_temp.fm_persona(array['flujos.configurar@' || pg_temp.fm_origen_de(a)]);
  f1 uuid := pg_temp.fm_fase(a, 'FM a', 10); f2 uuid := pg_temp.fm_fase(a, 'FM b', 20);
  f3 uuid := pg_temp.fm_fase(a, 'FM c', 30); f4 uuid := pg_temp.fm_fase(a, 'FM d', 40);
  j uuid := pg_temp.fm_fase(a, 'FM jubilada', 25, false);
  d1 uuid := pg_temp.fm_fase(a, 'FM e', 50); d2 uuid := pg_temp.fm_fase(a, 'FM f', 50);
  v0 timestamptz := pg_temp.fm_version(a); v1 timestamptz; v2 timestamptz;
begin
  v1 := pg_temp.fm_pasa('M2 tras la primera', pg_temp.fm_mover(config_a, f4, v0, f1));
  if not (v1 > v0 and v1 = pg_temp.fm_version(a)) then raise exception 'M2: devolvió % y el flujo tiene %', v1, pg_temp.fm_version(a); end if;
  if pg_temp.fm_orden(a) is distinct from 'FM a:10 FM d:20 FM b:30 FM jubilada:40 FM c:50 FM e:60 FM f:70' then
    raise exception 'M2: tras la primera quedó %', pg_temp.fm_orden(a);
  end if;
  v2 := pg_temp.fm_pasa('M2 al principio', pg_temp.fm_mover(config_a, f3, v1, null));
  if pg_temp.fm_orden(a) is distinct from 'FM c:10 FM a:20 FM d:30 FM b:40 FM jubilada:50 FM e:60 FM f:70' then
    raise exception 'M2: al principio quedó %', pg_temp.fm_orden(a);
  end if;
  if (select count(distinct orden) <> count(*) from public.fases where flujo_id = a) then raise exception 'M2: quedó un orden repetido'; end if;
  if not (v2 > v1) then raise exception 'M2: la versión no avanzó'; end if;
end $$;
rollback;

-- @test fases: fase_mover con la versión vieja da PT409, tras sí misma 22023 y con un ancla de otro flujo PT409, sin cambiar nada (M3)
begin;
do $$
declare
  a uuid := pg_temp.fm_flujo(); b uuid := pg_temp.fm_flujo();
  config_a uuid := pg_temp.fm_persona(array['flujos.configurar@' || pg_temp.fm_origen_de(a)]);
  f1 uuid := pg_temp.fm_fase(a, 'FM uno', 10); f2 uuid := pg_temp.fm_fase(a, 'FM dos', 20); ajena uuid := pg_temp.fm_fase(b, 'FM ajena', 10);
  v0 timestamptz := pg_temp.fm_version(a); antes text := pg_temp.fm_orden(a); r jsonb;
begin
  perform public._flujo_tocar(a);
  r := pg_temp.fm_mover(config_a, f2, v0, null);
  perform pg_temp.fm_da_error('M3 vieja', r, 'PT409', 'Otra persona cambió este flujo mientras lo editabas.');
  r := pg_temp.fm_mover(config_a, f2, pg_temp.fm_version(a), f2);
  perform pg_temp.fm_da_error('M3 tras sí misma', r, '22023', 'Una fase no puede ir después de sí misma.');
  if r ->> 'hint' is distinct from 'despues_de' then raise exception 'M3: el hint debía ser despues_de y dio %', r; end if;
  r := pg_temp.fm_mover(config_a, f1, pg_temp.fm_version(a), ajena);
  perform pg_temp.fm_da_error('M3 ancla ajena', r, 'PT409', 'Esa fase ya no está en este flujo. Recarga e intenta de nuevo.');
  if pg_temp.fm_orden(a) is distinct from antes then raise exception 'M3: un error cambió el orden: %', pg_temp.fm_orden(a); end if;
end $$;
rollback;
