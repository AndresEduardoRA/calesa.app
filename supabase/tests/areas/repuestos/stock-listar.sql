-- El stock de repuestos por cursor (paso 8.10-1, C4). No depende de otro archivo (`SOLO=areas/repuestos/stock-listar.sql`); cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   S6. La lista por cursor (en_stock_desde desc, id desc), con empate en la fecha separado por el id; sin eliminados ni stock 0; un cursor a medias,
--       22023; el título del vehículo sólo para quien lo ve; sin `repuestos.ver`, nada.

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


create or replace function pg_temp.rp_flujo() returns uuid language sql as $f$
  select id from public.flujos where ambito = 'repuestos';
$f$;

-- Deja una sola inicial activa en el flujo de repuestos («rp inicial») y la devuelve.
create or replace function pg_temp.rp_inicial() returns uuid language plpgsql as $f$
declare f uuid;
begin
  update public.fases set es_inicial = false where flujo_id = pg_temp.rp_flujo() and es_inicial;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (pg_temp.rp_flujo(), 'rp inicial', 1001, true) returning id into f;
  return f;
end $f$;

create or replace function pg_temp.rp_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('proyecto', pg_temp.rp_crear(p_quien, i, '{"vehiculo_etiqueta": "rp"}'));
  return i;
end $f$;

create or replace function pg_temp.rp_item(p_quien uuid, p_proyecto uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_item_crear(%L, %L, %L)', p_id, p_proyecto, p_datos));
$f$;

create or replace function pg_temp.rps_mover(p_quien uuid, p_item uuid, p_cantidad integer, p_motivo text, p_esperado integer, p_nota text default null)
returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_stock_mover(%L, %L, %L, %L, %L)', p_item, p_cantidad, p_motivo, p_esperado, p_nota));
$f$;

create or replace function pg_temp.rps_reasignar(p_quien uuid, p_item uuid, p_destino uuid, p_cantidad integer, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_stock_reasignar(%L, %L, %L, %L)', p_item, p_destino, p_cantidad, p_id));
$f$;

create or replace function pg_temp.rps_stock(p_item uuid) returns integer language sql as $f$
  select stock_cantidad from public.repuestos_items where id = p_item;
$f$;

create or replace function pg_temp.rps_movs(p_item uuid) returns integer language sql as $f$
  select count(*)::integer from public.repuestos_stock_movimientos where item_id = p_item;
$f$;

create or replace function pg_temp.rps_claves(p jsonb) returns text[] language sql as $f$
  select array_agg(k order by k) from jsonb_object_keys(p) k;
$f$;

-- @test repuestos: el stock por cursor, con empates separados por id; sin eliminados ni stock 0; el título sólo para quien ve el vehículo (S6)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'vehiculos.ver']);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  nadie uuid := pg_temp.rp_persona(array['vehiculos.ver']);
  v uuid := pg_temp.rp_vehiculo(pg_temp.rp_origen()); p uuid;
  t timestamptz := now() + interval '100 years'; a uuid; b uuid; c uuid; primero uuid; segundo uuid; r jsonb; cur jsonb;
  q text := 'select coalesce(jsonb_agg(to_jsonb(x)), ''[]'') from public.repuestos_stock_listar(%L, %L, 1) x';
begin
  insert into public.repuestos_proyectos (vehiculo_id) values (v) returning id into p;
  insert into public.repuestos_items (proyecto_id, descripcion, cantidad, stock_cantidad, en_stock_desde) values (p, 'rps a', 2, 2, t + interval '2 days')
    returning id into a;
  insert into public.repuestos_items (proyecto_id, descripcion, cantidad, stock_cantidad, en_stock_desde) values (p, 'rps b', 1, 1, t + interval '1 day')
    returning id into b;
  insert into public.repuestos_items (proyecto_id, descripcion, cantidad, stock_cantidad, en_stock_desde) values (p, 'rps c', 1, 1, t + interval '1 day')
    returning id into c;
  insert into public.repuestos_items (proyecto_id, descripcion, stock_cantidad, en_stock_desde, eliminado_en) values (p, 'rps eliminado', 1, t + interval '3 days', now());
  insert into public.repuestos_items (proyecto_id, descripcion, stock_cantidad) values (p, 'rps sin stock', 0);
  primero := case when b > c then b else c end;
  segundo := case when b > c then c else b end;

  r := pg_temp.rp_corre(ed, format(q, null, null));
  if jsonb_array_length(r) <> 2 or (r -> 0 ->> 'id')::uuid <> a then raise exception 'S6: la primera página debía empezar por a y traer una más: %', r; end if;
  if pg_temp.rps_claves(r -> 0) <> array['descripcion', 'en_stock_desde', 'id', 'proyecto_cerrado_en', 'proyecto_id', 'proyecto_numero', 'stock_cantidad',
                                          'vehiculo_etiqueta', 'vehiculo_id', 'vehiculo_titulo'] then
    raise exception 'S6: las claves de la fila no son las de C4: %', r -> 0;
  end if;
  if r -> 0 ->> 'vehiculo_titulo' is distinct from 'rp vehículo' or (r -> 0 ->> 'stock_cantidad')::integer <> 2 or (r -> 0 ->> 'proyecto_id')::uuid <> p then
    raise exception 'S6: la fila de a no es la esperada: %', r -> 0;
  end if;
  cur := r -> 0;
  r := pg_temp.rp_corre(ed, format(q, cur ->> 'en_stock_desde', cur ->> 'id'));
  if jsonb_array_length(r) <> 2 or (r -> 0 ->> 'id')::uuid <> primero then raise exception 'S6: la segunda página debía traer el de id mayor del empate: %', r; end if;
  cur := r -> 0;
  r := pg_temp.rp_corre(ed, format(q, cur ->> 'en_stock_desde', cur ->> 'id'));
  if jsonb_array_length(r) < 1 or (r -> 0 ->> 'id')::uuid <> segundo then raise exception 'S6: la tercera página debía traer el de id menor del empate: %', r; end if;
  if r -> 1 is not null and (r -> 1 ->> 'en_stock_desde')::timestamptz >= t then
    raise exception 'S6: tras los tres salió otro ítem de la prueba (eliminado o sin stock): %', r;
  end if;
  perform pg_temp.rp_es('S6 cursor a medias', pg_temp.rp_corre(ed, format(q, t, null)), '22023', 'cursor', 'El cursor de la lista no es válido.');
  r := pg_temp.rp_corre(ve, format(q, null, null));
  if (r -> 0 ->> 'id')::uuid <> a or r -> 0 ->> 'vehiculo_titulo' is not null then
    raise exception 'S6: quien no ve el vehículo no debía leer su título: %', r -> 0;
  end if;
  if pg_temp.rp_corre(nadie, format(q, null, null)) <> '[]'::jsonb then raise exception 'S6: sin repuestos.ver la lista trajo filas'; end if;
end $$;
rollback;
