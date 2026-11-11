-- La oferta de transporte de un flujo (paso 5.10-2): `flujo_oferta_guardar()` (reemplazo todo o nada con la versión del flujo y la regla
-- «transporte» encendida) y `flujo_oferta()` (la lectura). No depende de otro archivo (`SOLO=humo.sql,flujos-oferta.sql`). Cada bloque abre
-- su transacción y la revierte.
--
-- Qué asegura:
--   O1. Guarda 2 puertos de origen y 1 naviera y se relee igual (un inactivo se acepta; un repetido se colapsa).
--   O2. Un id inexistente → 23503 con el arreglo en el hint; no escribe ni mueve la versión.
--   O3. Guardar vacío borra todo (= se ofrece todo).
--   O4. Con «transporte» apagada → 23514; apagarla después de guardar no borra la oferta.
--   O5. Dos guardados con la misma versión: el segundo PT409 y no escribe.
--   O6. 42501 al asesor y a otro origen; inexistente PT409; forma 22023; anon no ejecuta.

create or replace function pg_temp.flo_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('flo_' || substr(v_id::text, 1, 8), 'FLO ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.flo_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen manual nuevo (su flujo nace con «transporte» encendida); devuelve el id del flujo.
create or replace function pg_temp.flo_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('flo_' || s, 'FLO origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.flo_config(p_flujo uuid) returns uuid language sql as $f$
  select pg_temp.flo_persona(array['flujos.configurar@' || (select origen_id from public.flujos where id = p_flujo)]);
$f$;

create or replace function pg_temp.flo_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.flo_filas(p_flujo uuid) returns int language sql as $f$
  select count(*)::int from public.flujos_transporte_oferta where flujo_id = p_flujo;
$f$;

create or replace function pg_temp.flo_puerto(p_nombre text, p_orden int, p_activo boolean) returns uuid language sql as $f$
  insert into public.puertos (nombre, orden, activo) values (p_nombre, p_orden, p_activo) returning id;
$f$;

create or replace function pg_temp.flo_naviera(p_nombre text) returns uuid language sql as $f$
  insert into public.navieras (nombre) values (p_nombre) returning id;
$f$;

-- La hoja que devuelve `flujo_oferta` para un puerto o una naviera.
create or replace function pg_temp.flo_hoja(p_id uuid, p_nombre text, p_activo boolean) returns jsonb language sql as $f$
  select jsonb_build_object('id', p_id, 'nombre', p_nombre, 'activo', p_activo);
$f$;

create or replace function pg_temp.flo_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.flo_guardar(p_quien uuid, p_flujo uuid, p_version timestamptz, p_o uuid[], p_d uuid[], p_n uuid[]) returns jsonb language sql as $f$
  select pg_temp.flo_corre(p_quien, format('select to_jsonb(public.flujo_oferta_guardar(%L, %L::timestamptz, %L::uuid[], %L::uuid[], %L::uuid[]))',
    p_flujo, p_version, p_o, p_d, p_n));
$f$;

create or replace function pg_temp.flo_oferta(p_quien uuid, p_flujo uuid) returns jsonb language sql as $f$
  select pg_temp.flo_corre(p_quien, format('select public.flujo_oferta(%L)', p_flujo));
$f$;

create or replace function pg_temp.flo_da_error(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.flo_es(p_que text, p_r jsonb, p_esperado jsonb) returns void language plpgsql as $f$
begin
  if p_r is distinct from p_esperado then raise exception '%: debía dar % y dio %', p_que, p_esperado, p_r; end if;
end $f$;

-- La versión que devolvió un guardado, o el error.
create or replace function pg_temp.flo_nueva(p_que text, p_r jsonb, p_antes timestamptz) returns timestamptz language plpgsql as $f$
declare v timestamptz;
begin
  if p_r ? 'error' or jsonb_typeof(p_r) <> 'string' then raise exception '%: debía devolver la versión y dio %', p_que, p_r; end if;
  v := (p_r #>> '{}')::timestamptz;
  if v <= p_antes then raise exception '%: la versión no se movió (% ≤ %)', p_que, v, p_antes; end if;
  return v;
end $f$;

-- @test oferta: guarda 2 puertos de origen y 1 naviera y se relee igual (O1)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); config uuid := pg_temp.flo_config(a); asesor uuid := pg_temp.flo_asesor();
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); p2 uuid := pg_temp.flo_puerto('FLO P2', 1, false);
  n uuid := pg_temp.flo_naviera('FLO N'); v timestamptz := pg_temp.flo_version(a);
begin
  perform pg_temp.flo_nueva('O1 guardar', pg_temp.flo_guardar(config, a, v, array[p2, p1, p2], '{}', array[n]), v);
  if pg_temp.flo_filas(a) <> 3 then raise exception 'O1: debía haber 3 filas y hay %', pg_temp.flo_filas(a); end if;
  -- Leer no pide configurar: el asesor relee lo mismo.
  perform pg_temp.flo_es('O1 relee', pg_temp.flo_oferta(asesor, a), jsonb_build_object(
    'transporte', true,
    'puertos_origen', jsonb_build_array(pg_temp.flo_hoja(p1, 'FLO P1', true), pg_temp.flo_hoja(p2, 'FLO P2', false)),
    'puertos_destino', '[]'::jsonb,
    'navieras', jsonb_build_array(pg_temp.flo_hoja(n, 'FLO N', true))));
end $$;
rollback;

-- @test oferta: un id inexistente da 23503 y la oferta y la versión quedan como estaban (O2)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); config uuid := pg_temp.flo_config(a);
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); p3 uuid := pg_temp.flo_puerto('FLO P3', 2, true);
  n uuid := pg_temp.flo_naviera('FLO N'); v timestamptz := pg_temp.flo_version(a); antes jsonb;
begin
  v := pg_temp.flo_nueva('O2 primero', pg_temp.flo_guardar(config, a, v, array[p1], '{}', array[n]), v);
  antes := pg_temp.flo_oferta(config, a);
  perform pg_temp.flo_da_error('O2 puerto inexistente',
    pg_temp.flo_guardar(config, a, v, array[p3, gen_random_uuid()], '{}', '{}'), '23503', 'puertos_origen');
  perform pg_temp.flo_da_error('O2 puerto en navieras', pg_temp.flo_guardar(config, a, v, '{}', '{}', array[p1]), '23503', 'navieras');
  perform pg_temp.flo_es('O2 no escribió', pg_temp.flo_oferta(config, a), antes);
  if pg_temp.flo_version(a) <> v then raise exception 'O2: la versión se movió'; end if;
end $$;
rollback;

-- @test oferta: guardar vacío borra todo (O3)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); config uuid := pg_temp.flo_config(a);
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); n uuid := pg_temp.flo_naviera('FLO N'); v timestamptz := pg_temp.flo_version(a);
begin
  v := pg_temp.flo_nueva('O3 primero', pg_temp.flo_guardar(config, a, v, array[p1], array[p1], array[n]), v);
  perform pg_temp.flo_nueva('O3 vacío', pg_temp.flo_guardar(config, a, v, '{}', '{}', null), v);
  perform pg_temp.flo_es('O3 relee', pg_temp.flo_oferta(config, a),
    '{"transporte": true, "puertos_origen": [], "puertos_destino": [], "navieras": []}');
  if pg_temp.flo_filas(a) <> 0 then raise exception 'O3: quedaron filas'; end if;
end $$;
rollback;

-- @test oferta: con «transporte» apagada da 23514; apagarla después no borra la oferta (O4)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); b uuid := pg_temp.flo_flujo(); config_a uuid := pg_temp.flo_config(a); config_b uuid := pg_temp.flo_config(b);
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); r jsonb;
begin
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'transporte';
  perform pg_temp.flo_da_error('O4 apagada', pg_temp.flo_guardar(config_a, a, pg_temp.flo_version(a), array[p1], '{}', '{}'), '23514', 'transporte');
  if pg_temp.flo_filas(a) <> 0 then raise exception 'O4: escribió con la regla apagada'; end if;

  perform pg_temp.flo_nueva('O4 encendida', pg_temp.flo_guardar(config_b, b, pg_temp.flo_version(b), array[p1], '{}', '{}'), '-infinity');
  update public.flujos_reglas set activa = false where flujo_id = b and regla = 'transporte';
  r := pg_temp.flo_oferta(config_b, b);
  perform pg_temp.flo_es('O4 sigue', r, jsonb_build_object('transporte', false,
    'puertos_origen', jsonb_build_array(pg_temp.flo_hoja(p1, 'FLO P1', true)), 'puertos_destino', '[]'::jsonb, 'navieras', '[]'::jsonb));
end $$;
rollback;

-- @test oferta: dos guardados con la misma versión, el segundo PT409 y no escribe (O5)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); config uuid := pg_temp.flo_config(a);
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); p3 uuid := pg_temp.flo_puerto('FLO P3', 2, true);
  v timestamptz := pg_temp.flo_version(a); v2 timestamptz;
begin
  v2 := pg_temp.flo_nueva('O5 primero', pg_temp.flo_guardar(config, a, v, array[p1], '{}', '{}'), v);
  perform pg_temp.flo_da_error('O5 segundo', pg_temp.flo_guardar(config, a, v, array[p3], '{}', '{}'), 'PT409');
  perform pg_temp.flo_es('O5 quedó el primero', pg_temp.flo_oferta(config, a) -> 'puertos_origen',
    jsonb_build_array(pg_temp.flo_hoja(p1, 'FLO P1', true)));
  if pg_temp.flo_version(a) <> v2 then raise exception 'O5: el segundo movió la versión'; end if;
end $$;
rollback;

-- @test oferta: 42501 al asesor y a otro origen; inexistente PT409; forma 22023; anon no ejecuta (O6)
begin;
do $$
declare
  a uuid := pg_temp.flo_flujo(); b uuid := pg_temp.flo_flujo(); config_b uuid := pg_temp.flo_config(b); asesor uuid := pg_temp.flo_asesor();
  p1 uuid := pg_temp.flo_puerto('FLO P1', 0, true); v timestamptz := pg_temp.flo_version(a);
begin
  perform pg_temp.flo_da_error('O6 asesor', pg_temp.flo_guardar(asesor, a, v, array[p1], '{}', '{}'), '42501');
  perform pg_temp.flo_da_error('O6 otro origen', pg_temp.flo_guardar(config_b, a, v, array[p1], '{}', '{}'), '42501');
  if pg_temp.flo_filas(a) <> 0 then raise exception 'O6: escribió sin permiso'; end if;
  perform pg_temp.flo_da_error('O6 inexistente guardar', pg_temp.flo_guardar(config_b, gen_random_uuid(), now(), '{}', '{}', '{}'), 'PT409');
  perform pg_temp.flo_da_error('O6 inexistente leer', pg_temp.flo_oferta(config_b, gen_random_uuid()), 'PT409');
  perform pg_temp.flo_da_error('O6 elemento nulo',
    pg_temp.flo_guardar(config_b, b, pg_temp.flo_version(b), array[p1], array[null]::uuid[], '{}'), '22023', 'puertos_destino');
  perform pg_temp.flo_da_error('O6 demasiados', pg_temp.flo_guardar(config_b, b, pg_temp.flo_version(b), '{}', '{}',
    array(select gen_random_uuid() from generate_series(1, 201))), '22023', 'navieras');
  if has_function_privilege('anon', 'public.flujo_oferta_guardar(uuid, timestamptz, uuid[], uuid[], uuid[])', 'execute')
     or has_function_privilege('anon', 'public.flujo_oferta(uuid)', 'execute') then
    raise exception 'O6: anon ejecuta una RPC de la oferta';
  end if;
end $$;
rollback;
