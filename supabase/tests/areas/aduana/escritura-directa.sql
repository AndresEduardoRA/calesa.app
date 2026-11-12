-- Aduana sin escritura directa (paso 6.07-2, C20). No depende de otro archivo (`SOLO=areas/aduana/escritura-directa.sql`). Los ayudantes son copia de
-- `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. Como authenticated con todas las claves, insert, update y delete directos en declaraciones_aduana y declaraciones_vehiculos dan 42501; sin
--       escritura de tabla ni de columna para authenticated; ninguna policy de escritura; el select sigue; aplicado_en nombra las tres RPC.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.adu_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-adu@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('adu_' || substr(v_id::text, 1, 8), 'adu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen `manual` con la regla `aduana` encendida, una fase que permite aduana (con v1, v2, v3) y otra que no (con v4); otro origen, sin la regla aduana, con w.
create or replace function pg_temp.adu_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; fb uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid; w uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('adu_' || s, 'adu origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('adu2_' || s, 'adu origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'aduana', true)
    on conflict (flujo_id, regla) do update set activa = true;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values (fl, 'adu en aduana', 1, true, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, permite_aduana) values (fl, 'adu sin aduana', 2, false) returning id into fb;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v1', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v2', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v3', fa) returning id into v3;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v4', fb) returning id into v4;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w') returning id into w;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase_no', fb, 'v1', v1, 'v2', v2, 'v3', v3, 'v4', v4, 'w', w);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.adu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.adu_guardar(p_quien uuid, p_id uuid, p_esperada timestamptz, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_guardar(%L, %L, %L)', p_id, p_esperada, p_datos));
$f$;

create or replace function pg_temp.adu_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.adu_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

-- @test aduana: declaraciones_aduana y declaraciones_vehiculos no se escriben directo, sólo por sus RPC (E1)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; r jsonb; d jsonb; v_sql text; v_tabla text;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d := pg_temp.adu_guardar(p, null, null, '{"numero": "DUI-E1"}');
  perform pg_temp.adu_pasa('E1 por la RPC', d);
  perform pg_temp.adu_pasa('E1 poner por la RPC', pg_temp.adu_corre(p, format('select public.declaracion_vehiculos_poner(%L, %L, %L, %L)',
    d ->> 'id', d ->> 'actualizado_en', array[t ->> 'v1'], '{}'::uuid[])));
  foreach v_sql in array array[
    'insert into public.declaraciones_aduana (numero) values (''DUI-E1-2'') returning to_jsonb(id)',
    format('update public.declaraciones_aduana set notas = %L where id = %L returning to_jsonb(id)', 'x', d ->> 'id'),
    format('delete from public.declaraciones_aduana where id = %L returning to_jsonb(id)', d ->> 'id'),
    format('insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values (%L, %L) returning to_jsonb(vehiculo_id)', d ->> 'id', t ->> 'v2'),
    format('update public.declaraciones_vehiculos set removido_en = now() where declaracion_id = %L returning to_jsonb(vehiculo_id)', d ->> 'id'),
    format('delete from public.declaraciones_vehiculos where declaracion_id = %L returning to_jsonb(vehiculo_id)', d ->> 'id')
  ] loop
    r := pg_temp.adu_corre(p, v_sql);
    perform pg_temp.adu_es('E1 ' || left(v_sql, 40), r, '42501');
  end loop;
  foreach v_tabla in array array['declaraciones_aduana', 'declaraciones_vehiculos'] loop
    if exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name = v_tabla and grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE', 'DELETE')) then
      raise exception 'E1: authenticated no debía tener escritura de tabla en %', v_tabla;
    end if;
    if exists (select 1 from information_schema.column_privileges
                where table_schema = 'public' and table_name = v_tabla and grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE')) then
      raise exception 'E1: authenticated no debía tener escritura de columna en %', v_tabla;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) then
      raise exception 'E1: no debía quedar una policy de escritura en %', v_tabla;
    end if;
  end loop;
  r := pg_temp.adu_corre(p, format('select to_jsonb(numero) from public.declaraciones_aduana where id = %L', d ->> 'id'));
  if r is distinct from '"DUI-E1"'::jsonb then raise exception 'E1: el select de la cabecera debía seguir y dio %', r; end if;
  r := pg_temp.adu_corre(p, format('select to_jsonb(count(*)) from public.declaraciones_vehiculos where declaracion_id = %L', d ->> 'id'));
  if r is distinct from '1'::jsonb then raise exception 'E1: el select de la composición debía seguir y dio %', r; end if;
  if (select aplicado_en from public.permisos where clave = 'logistica.aduana.gestionar')
     is distinct from 'declaracion_guardar, declaracion_vehiculos_poner, declaracion_canal' then
    raise exception 'E1: aplicado_en debía nombrar las tres RPC';
  end if;
end $$;
rollback;
