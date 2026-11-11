-- Mover no edita la ficha y la papelera mira los documentos (paso 6.02-1). No depende de otro archivo (`SOLO=areas/mover/version.sql`). Cada bloque
-- abre su transacción y la revierte.
--
-- Qué asegura:
--   Vs1. `cambiar_fase` no mueve `vehiculos.actualizado_en` ni escribe `vehiculos.update` en `actividad`; el cambio consta una vez como
--        `unidad.fase_cambiada`; editar otra columna sigue moviendo la versión y auditando.
--   Vs2. `_vehiculo_motivo_de_bloqueo(v, true)` (enviar y la limpieza) frena con un documento vivo; la purga (`false`) no; uno borrado no frena.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.mvs_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mvs@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.mvs_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mvs_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mvs_' || substr(v_id::text, 1, 8), 'mvs ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mvs_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.mvs_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mvs_' || s, 'mvs origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.mvs_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.mvs_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (p_flujo, p_nombre, p_orden, p_inicial) returning id;
$f$;

create or replace function pg_temp.mvs_transicion(p_flujo uuid, p_de uuid, p_a uuid, p_nota boolean default false) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, nota_obligatoria) values (p_flujo, p_de, p_a, p_nota) returning id;
$f$;

create or replace function pg_temp.mvs_vehiculo(p_flujo uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (pg_temp.mvs_origen_de(p_flujo), 'mvs vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.mvs_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.mvs_mover(p_quien uuid, p_v uuid, p_a uuid, p_esperada uuid, p_nota text default null) returns jsonb language sql as $f$
  select pg_temp.mvs_corre(p_quien, format('select jsonb_build_object(''historial'', public.cambiar_fase(%L, null, %L, %L, %L))', p_v, p_a, p_nota, p_esperada));
$f$;

create or replace function pg_temp.mvs_ver(p_quien uuid, p_v uuid, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.mvs_corre(p_quien, format('select public.previsualizar_cambio_fase(%L, null, %L)', p_v, p_a));
$f$;

-- Da ese error con ese hint (y ese mensaje, si se pide).
create or replace function pg_temp.mvs_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.mvs_pasa(p_que text, p_r jsonb) returns bigint language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'historial' is null then raise exception '%: debía mover y dio %', p_que, p_r; end if;
  return (p_r ->> 'historial')::bigint;
end $f$;

create or replace function pg_temp.mvs_fase_de(p_v uuid) returns uuid language sql as $f$
  select fase_id from public.vehiculos where id = p_v;
$f$;

create or replace function pg_temp.mvs_historial(p_v uuid) returns int language sql as $f$
  select count(*)::int from public.historial_fases where vehiculo_id = p_v;
$f$;

-- @test mover: mover no mueve la versión de la ficha ni audita vehiculos.update; la actividad queda una vez; editar sí la mueve (Vs1)
begin;
do $$
declare
  a uuid := pg_temp.mvs_flujo(); o uuid := pg_temp.mvs_origen_de(a);
  f uuid := pg_temp.mvs_fase(a, 'mvs uno', 10, true); g uuid := pg_temp.mvs_fase(a, 'mvs dos', 20);
  t uuid := pg_temp.mvs_transicion(a, f, g); v uuid := pg_temp.mvs_vehiculo(a, f);
  mueve uuid := pg_temp.mvs_persona(array['logistica.ver', 'flujos.mover@' || o]);
  vieja constant timestamptz := '2020-01-01 00:00:00+00';
begin
  -- La versión sembrada vieja sin pasar por los triggers (como postgres).
  perform set_config('session_replication_role', 'replica', true);
  update public.vehiculos set actualizado_en = vieja where id = v;
  perform set_config('session_replication_role', 'origin', true);
  perform pg_temp.mvs_pasa('Vs1 mover', pg_temp.mvs_mover(mueve, v, g, f));
  if (select actualizado_en from public.vehiculos where id = v) is distinct from vieja then raise exception 'Vs1: mover movió la versión de la ficha'; end if;
  if exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = v::text and accion = 'vehiculos.update') then
    raise exception 'Vs1: mover dejó un vehiculos.update en actividad';
  end if;
  if (select count(*) from public.actividad where registro_id = v::text and accion = 'unidad.fase_cambiada') <> 1 then
    raise exception 'Vs1: el cambio de fase debía constar una vez en actividad';
  end if;
  update public.vehiculos set titulo = 'mvs editado' where id = v;
  if (select actualizado_en from public.vehiculos where id = v) = vieja
     or not exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = v::text and accion = 'vehiculos.update') then
    raise exception 'Vs1: editar el título debía mover la versión y auditar (los triggers siguen vivos)';
  end if;
end $$;
rollback;

-- @test mover: un vehículo con documentos vivos no va a la papelera; la purga no frena por ellos (Vs2)
begin;
do $$
declare
  a uuid := pg_temp.mvs_flujo(); f uuid := pg_temp.mvs_fase(a, 'mvs uno', 10, true); v uuid := pg_temp.mvs_vehiculo(a, f); td uuid;
  motivo constant text := 'Tiene documentos cargados.';
begin
  if (select public._vehiculo_motivo_de_bloqueo(x, true) from public.vehiculos x where x.id = v) is not null then
    raise exception 'Vs2: sin documentos no debía frenar';
  end if;
  insert into public.tipos_documento (nombre) values ('mvs factura ' || substr(gen_random_uuid()::text, 1, 6)) returning id into td;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v, td);
  if (select public._vehiculo_motivo_de_bloqueo(x, true) from public.vehiculos x where x.id = v) is distinct from motivo then
    raise exception 'Vs2: con un documento vivo, enviar debía frenar con «%»', motivo;
  end if;
  if (select public._vehiculo_motivo_de_bloqueo(x, false) from public.vehiculos x where x.id = v) is not null then
    raise exception 'Vs2: la purga no debía frenar por los documentos';
  end if;
  update public.documentos set eliminado_en = now() where vehiculo_id = v;
  if (select public._vehiculo_motivo_de_bloqueo(x, true) from public.vehiculos x where x.id = v) is not null then
    raise exception 'Vs2: un documento borrado no debía frenar';
  end if;
end $$;
rollback;
