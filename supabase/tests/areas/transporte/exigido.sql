-- Lo que la fase exige (paso 6.07-1, C10–C12, D17). No depende de otro archivo (`SOLO=areas/transporte/exigido.sql`). Los ayudantes son copia de
-- `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   X1. Con `transporte.contenedor` bloqueante en la fase: vaciar el contenedor por la RPC da 23514 hint contenedor y sigue; cambiarlo por otro pasa; con
--       el requisito no bloqueante, vaciar pasa.
--   X3. Un update directo como superusuario también da 23514.
--   X4. Borrar una naviera que usa una unidad cuya fase exige `transporte.naviera` bloqueante da 23514 y la fila sigue (D17).

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.trn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'tr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen (con su flujo y sus reglas encendidas), una fase y un vehículo en ella.
create or replace function pg_temp.trn_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v uuid; v2 uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tr_' || s, 'tr origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tr2_' || s, 'tr origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tr en tránsito', 1, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tr vehículo', fa) returning id into v;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'tr vehículo 2') returning id into v2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'v', v, 'v2', v2);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.trn_guardar(p_quien uuid, p_v uuid, p_esperada timestamptz, p_cambios jsonb, p_r uuid default null) returns jsonb
language sql as $f$
  select pg_temp.trn_corre(p_quien, format('select public.transporte_guardar(%L, %L, %L, %L)', p_v, p_r, p_esperada, p_cambios));
$f$;

create or replace function pg_temp.trn_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.trn_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

create or replace function pg_temp.trn_requisito(p_fase uuid, p_clave text, p_bloqueante boolean default true) returns uuid language sql as $f$
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (p_fase, 'dato', p_bloqueante, p_clave) returning id;
$f$;

-- Un superusuario corre `p_sql`: null si pasa, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_directo(p_sql text) returns jsonb language plpgsql as $f$
declare v_m text; v_e text; v_h text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
  return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
end $f$;

-- @test transporte: no se vacía el contenedor que la fase exige; cambiarlo o sin bloqueante pasa (X1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v1 timestamptz; q uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  v1 := pg_temp.trn_pasa('X1 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"contenedor": "MSKU1"}'));
  q := pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.contenedor');
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": null}');
  perform pg_temp.trn_es('X1 vaciar', r, '23514', 'contenedor');
  if (select contenedor from public.transportes where vehiculo_id = (t ->> 'v')::uuid) is distinct from 'MSKU1' then raise exception 'X1: debía seguir'; end if;
  v1 := pg_temp.trn_pasa('X1 cambiar por otro', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": "MSKU2"}'));
  update public.fases_requisitos set bloqueante = false where id = q;
  perform pg_temp.trn_pasa('X1 no bloqueante', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": null}'));
end $$;
rollback;

-- @test transporte: un update directo como superusuario tampoco vacía lo exigido (X3)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_pasa('X3 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "BK1", "eta_el": "2026-12-01"}'));
  perform pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.eta');
  r := pg_temp.trn_directo(format('update public.transportes set eta_el = null where vehiculo_id = %L', t ->> 'v'));
  perform pg_temp.trn_es('X3 directo', r, '23514', 'eta_el');
  if pg_temp.trn_directo(format('update public.transportes set booking = null where vehiculo_id = %L', t ->> 'v')) is not null then
    raise exception 'X3: vaciar lo que la fase no exige debía pasar';
  end if;
end $$;
rollback;

-- @test transporte: no se borra una naviera que una fase exige como bloqueante (X4)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; nav uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tr naviera') returning id into nav;
  perform pg_temp.trn_pasa('X4 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, jsonb_build_object('naviera_id', nav)));
  perform pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.naviera');
  r := pg_temp.trn_directo(format('delete from public.navieras where id = %L', nav));
  perform pg_temp.trn_es('X4 borrar la naviera', r, '23514', 'naviera_id');
  if (select naviera_id from public.transportes where vehiculo_id = (t ->> 'v')::uuid) is distinct from nav then raise exception 'X4: la fila debía seguir'; end if;
end $$;
rollback;
