-- Un valor de catálogo de repuestos en uso no se borra (paso 8.08-1, C12). No depende de otro archivo (`SOLO=areas/repuestos/catalogos.sql`); cada
-- bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   K1. Con `repuestos.configurar` (y sin `repuestos.ver`): borrar un valor sin uso pasa; uno que usa un ítem eliminado da 23514 hint en_uso y el ítem
--       conserva su valor; uno que usa una línea de cotización, 23514. Sin `repuestos.configurar`, el borrado no toca filas (policy).
--   K2. Sin `repuestos.configurar`, crear un valor da 42501 (policy de INSERT); con él, pasa (8.08-2: las actions escriben directo bajo RLS).
--   K3. Sin `repuestos.configurar`, renombrar un valor no toca filas; con él, toca una (policy de UPDATE).
--   K4. (8.10-1, H1 de 8.08-2) Con `repuestos.configurar`, cambiar `catalogo`, `id` o `datos` de un valor da 42501 (UPDATE sólo de nombre, activo y orden).

create or replace function pg_temp.rp_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rp@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`.
create or replace function pg_temp.rp_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rp_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rp_' || substr(v_id::text, 1, 8), 'rp ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rp_origen() returns uuid language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('rp_' || s, 'rp origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.rp_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'rp vehículo') returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rp_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rp_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rp_crear(p_quien uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', p_id, p_datos));
$f$;


-- @test repuestos: un valor de catálogo en uso no se borra; sin uso, sí; sin configurar, no toca filas (K1)
begin;
do $$
declare
  conf uuid := pg_temp.rp_persona(array['repuestos.configurar']);
  nadie uuid := pg_temp.rp_persona(array['repuestos.ver']);
  libre uuid; usado uuid; cotizado uuid; p uuid; it uuid; c uuid;
begin
  insert into public.repuestos_catalogos (catalogo, nombre) values ('tipo_pieza', 'rpk libre') returning id into libre;
  insert into public.repuestos_catalogos (catalogo, nombre) values ('tipo_pieza', 'rpk usado') returning id into usado;
  insert into public.repuestos_catalogos (catalogo, nombre) values ('condicion', 'rpk cotizado') returning id into cotizado;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('rpk') returning id into p;
  insert into public.repuestos_items (proyecto_id, descripcion, tipo_pieza_id, eliminado_en) values (p, 'rpk', usado, now()) returning id into it;
  insert into public.repuestos_cotizaciones (proyecto_id, moneda, config_snapshot) values (p, 'USD', '{}') returning id into c;
  insert into public.repuestos_cotizaciones_lineas (cotizacion_id, descripcion, condicion_id, bloque) values (c, 'rpk', cotizado, 'importado');

  if pg_temp.rp_corre(nadie, format('with x as (delete from public.repuestos_catalogos where id = %L returning 1) select to_jsonb(count(*)) from x', libre))
     <> '0'::jsonb then
    raise exception 'K1: sin repuestos.configurar se borró un valor';
  end if;
  perform pg_temp.rp_es('K1 usado por un ítem eliminado', pg_temp.rp_corre(conf, format(
    'with x as (delete from public.repuestos_catalogos where id = %L returning 1) select to_jsonb(count(*)) from x', usado)), '23514', 'en_uso',
    '“rpk usado” está en uso: desactívalo para que no se elija más.');
  if (select tipo_pieza_id from public.repuestos_items where id = it) is distinct from usado then raise exception 'K1: el ítem perdió su valor'; end if;
  perform pg_temp.rp_es('K1 usado por una línea de cotización', pg_temp.rp_corre(conf, format(
    'with x as (delete from public.repuestos_catalogos where id = %L returning 1) select to_jsonb(count(*)) from x', cotizado)), '23514', 'en_uso');
  if pg_temp.rp_corre(conf, format('with x as (delete from public.repuestos_catalogos where id = %L returning 1) select to_jsonb(count(*)) from x', libre))
     <> '1'::jsonb then
    raise exception 'K1: un valor sin uso no se borró';
  end if;
end $$;
rollback;


-- @test repuestos: crear un valor de catálogo pide repuestos.configurar (K2)
begin;
do $$
declare
  conf uuid := pg_temp.rp_persona(array['repuestos.configurar']);
  nadie uuid := pg_temp.rp_persona(array['repuestos.ver']);
begin
  perform pg_temp.rp_es('K2 sin configurar', pg_temp.rp_corre(nadie,
    $q$with x as (insert into public.repuestos_catalogos (catalogo, nombre) values ('pais_origen', 'rpk nadie') returning 1) select to_jsonb(count(*)) from x$q$),
    '42501', null);
  if pg_temp.rp_ok('K2 con configurar', pg_temp.rp_corre(conf,
    $q$with x as (insert into public.repuestos_catalogos (catalogo, nombre) values ('pais_origen', 'rpk conf') returning 1) select to_jsonb(count(*)) from x$q$))
     <> '1'::jsonb then
    raise exception 'K2: con repuestos.configurar no se creó el valor';
  end if;
end $$;
rollback;

-- @test repuestos: guardar un valor de catálogo pide repuestos.configurar (K3)
begin;
do $$
declare
  conf uuid := pg_temp.rp_persona(array['repuestos.configurar']);
  nadie uuid := pg_temp.rp_persona(array['repuestos.ver']);
  v uuid;
begin
  insert into public.repuestos_catalogos (catalogo, nombre) values ('condicion', 'rpk guardar') returning id into v;
  if pg_temp.rp_ok('K3 sin configurar', pg_temp.rp_corre(nadie, format(
    'with x as (update public.repuestos_catalogos set nombre = %L where id = %L returning 1) select to_jsonb(count(*)) from x', 'rpk nadie', v)))
     <> '0'::jsonb then
    raise exception 'K3: sin repuestos.configurar se renombró un valor';
  end if;
  if (select nombre from public.repuestos_catalogos where id = v) is distinct from 'rpk guardar' then
    raise exception 'K3: el nombre cambió sin permiso';
  end if;
  if pg_temp.rp_ok('K3 con configurar', pg_temp.rp_corre(conf, format(
    'with x as (update public.repuestos_catalogos set nombre = %L, activo = false where id = %L returning 1) select to_jsonb(count(*)) from x', 'rpk conf', v)))
     <> '1'::jsonb then
    raise exception 'K3: con repuestos.configurar no se renombró el valor';
  end if;
end $$;
rollback;

-- @test repuestos: un valor no cambia de catálogo, de id ni de datos; nombre, activo y orden sí (K4)
begin;
do $$
declare
  conf uuid := pg_temp.rp_persona(array['repuestos.configurar']);
  v uuid;
begin
  insert into public.repuestos_catalogos (catalogo, nombre) values ('condicion', 'rpk columnas') returning id into v;
  perform pg_temp.rp_es('K4 catalogo', pg_temp.rp_corre(conf, format(
    'with x as (update public.repuestos_catalogos set catalogo = %L where id = %L returning 1) select to_jsonb(count(*)) from x', 'pais_origen', v)),
    '42501', null);
  perform pg_temp.rp_es('K4 id', pg_temp.rp_corre(conf, format(
    'with x as (update public.repuestos_catalogos set id = %L where id = %L returning 1) select to_jsonb(count(*)) from x', gen_random_uuid(), v)),
    '42501', null);
  perform pg_temp.rp_es('K4 datos', pg_temp.rp_corre(conf, format(
    'with x as (update public.repuestos_catalogos set datos = %L where id = %L returning 1) select to_jsonb(count(*)) from x', '{"a": 1}', v)),
    '42501', null);
  if pg_temp.rp_ok('K4 nombre, activo y orden', pg_temp.rp_corre(conf, format(
    'with x as (update public.repuestos_catalogos set nombre = %L, activo = false, orden = 7 where id = %L returning 1) select to_jsonb(count(*)) from x',
    'rpk otro', v))) <> '1'::jsonb then
    raise exception 'K4: con repuestos.configurar no se guardó el valor';
  end if;
  if (select catalogo from public.repuestos_catalogos where id = v) <> 'condicion' then raise exception 'K4: el valor cambió de catálogo'; end if;
end $$;
rollback;
