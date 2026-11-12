-- La lista de proyectos de repuestos (paso 8.08-1, C9). No depende de otro archivo (`SOLO=areas/repuestos/listar.sql`); cada bloque abre su
-- transacción y la revierte. Cada prueba aísla sus proyectos con una etiqueta propia (la búsqueda de 3 o más caracteres).
--
-- Qué asegura:
--   L1. Cinco proyectos de a 2: tres filas (una de más), en numero desc, sin repetir ni saltar al seguir el cursor; `cerrados` trae sólo los cerrados;
--       un texto de 2 letras se ignora; el número exacto encuentra el suyo; uno eliminado no sale; un estado inválido da 22023 hint estado.
--   L2. Un proyecto con un ítem en una fase final de llegada, uno en una final de pérdida, uno en stock y uno en tránsito: items 4, terminados 2,
--       en_stock 1, pendientes 1; el título del vehículo, nulo para quien no ve su origen.

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


create or replace function pg_temp.rp_listar(p_quien uuid, p_cursor bigint, p_tamano int, p_q text, p_estado text) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format(
    'select coalesce(jsonb_agg(to_jsonb(x) order by x.numero desc), ''[]'') from public.repuestos_proyectos_listar(%L, %L, %L, %L) x',
    p_cursor, p_tamano, p_q, p_estado));
$f$;

-- @test repuestos: la lista por cursor, sin repetir ni saltar; estado, texto, número y eliminados (L1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  marca text := 'rpl' || substr(md5(gen_random_uuid()::text), 1, 6);
  ids uuid[] := '{}'; i uuid; n int; r jsonb; vistos uuid[] := '{}'; v_cursor bigint; e jsonb; borrado uuid := gen_random_uuid();
begin
  for n in 1..5 loop
    i := gen_random_uuid(); ids := ids || i;
    perform pg_temp.rp_ok('L1 crear', pg_temp.rp_crear(ed, i, jsonb_build_object('vehiculo_etiqueta', marca || ' ' || n)));
  end loop;
  -- Página a página, de a 2: cada una trae una de más, que la siguiente vuelve a traer como primera.
  loop
    r := pg_temp.rp_listar(ed, v_cursor, 2, marca, null);
    if r ? 'error' then raise exception 'L1: la lista dio %', r; end if;
    if v_cursor is null and jsonb_array_length(r) <> 3 then raise exception 'L1: la primera página de 2 debía traer 3 filas y trajo %', jsonb_array_length(r); end if;
    for e in select x from jsonb_array_elements(r) with ordinality t(x, k) where k <= 2 loop
      if (e ->> 'id')::uuid = any (vistos) then raise exception 'L1: el cursor repitió %', e ->> 'id'; end if;
      if v_cursor is not null and (e ->> 'numero')::bigint >= v_cursor then raise exception 'L1: la página no sigue en numero desc'; end if;
      vistos := vistos || (e ->> 'id')::uuid; v_cursor := (e ->> 'numero')::bigint;
    end loop;
    exit when jsonb_array_length(r) <= 2;
  end loop;
  if cardinality(vistos) <> 5 or not (vistos @> ids) then raise exception 'L1: el cursor saltó filas: % de 5', cardinality(vistos); end if;
  if (select array_agg(x order by x) from unnest(vistos) x) is distinct from (select array_agg(x order by x) from unnest(ids) x) then
    raise exception 'L1: el cursor trajo otras filas';
  end if;
  -- Cerrados: sólo los dos que se cerraron.
  foreach i in array ids[1:2] loop
    perform pg_temp.rp_ok('L1 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', i,
      (select actualizado_en from public.repuestos_proyectos where id = i))));
  end loop;
  r := pg_temp.rp_listar(ed, null, 50, marca, 'cerrados');
  if (select array_agg((x ->> 'id')::uuid order by x ->> 'id') from jsonb_array_elements(r) x) is distinct from
     (select array_agg(x order by x::text) from unnest(ids[1:2]) x) then
    raise exception 'L1: cerrados debía traer sólo los dos cerrados y trajo %', r;
  end if;
  if jsonb_array_length(pg_temp.rp_listar(ed, null, 50, marca, 'abiertos')) <> 3 then raise exception 'L1: abiertos debía traer tres'; end if;
  -- Un texto de 2 letras se ignora: trae lo mismo que sin texto.
  if pg_temp.rp_listar(ed, null, 100, 'rp', null) is distinct from pg_temp.rp_listar(ed, null, 100, null, null) then
    raise exception 'L1: un texto de 2 letras filtró';
  end if;
  -- El número exacto encuentra el suyo.
  r := pg_temp.rp_listar(ed, null, 100, (select numero::text from public.repuestos_proyectos where id = ids[3]), null);
  if not exists (select 1 from jsonb_array_elements(r) x where (x ->> 'id')::uuid = ids[3]) then raise exception 'L1: el número no encontró su proyecto'; end if;
  if pg_temp.rp_listar(ed, null, 10, repeat('9', 25), null) ? 'error' then raise exception 'L1: 25 dígitos rompieron la lista'; end if;
  -- Uno eliminado no sale.
  perform pg_temp.rp_ok('L1 crear borrado', pg_temp.rp_crear(ed, borrado, jsonb_build_object('vehiculo_etiqueta', marca || ' borrado')));
  perform pg_temp.rp_ok('L1 eliminar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', borrado,
    (select actualizado_en from public.repuestos_proyectos where id = borrado))));
  if exists (select 1 from jsonb_array_elements(pg_temp.rp_listar(ed, null, 50, marca, null)) x where (x ->> 'id')::uuid = borrado) then
    raise exception 'L1: un proyecto eliminado sale en la lista';
  end if;
  perform pg_temp.rp_es('L1 estado inválido', pg_temp.rp_listar(ed, null, 50, null, 'todos'), '22023', 'estado');
end $$;
rollback;

-- @test repuestos: las cuentas de ítems de un proyecto y el título del vehículo sólo para quien lo ve (L2)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o]);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  fl uuid := (select id from public.flujos where ambito = 'repuestos');
  recibido uuid; perdido uuid; transito uuid; p uuid := gen_random_uuid(); r jsonb;
begin
  insert into public.fases (flujo_id, nombre, orden) values (fl, 'rpl tránsito', 1010) returning id into transito;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fl, 'rpl recibido', 1020, true) returning id into recibido;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fl, 'rpl perdido', 1030, true) returning id into perdido;
  perform pg_temp.rp_ok('L2 crear', pg_temp.rp_crear(ed, p, jsonb_build_object('vehiculo_id', v)));
  insert into public.repuestos_items (proyecto_id, descripcion, fase_id, en_stock_desde) values
    (p, 'recibido', recibido, null), (p, 'perdido', perdido, null), (p, 'en stock', recibido, now()), (p, 'en tránsito', transito, null);
  insert into public.repuestos_items (proyecto_id, descripcion, fase_id, eliminado_en) values (p, 'eliminado', transito, now());
  r := pg_temp.rp_corre(ed, format('select to_jsonb(x) from public.repuestos_proyectos_listar(null, 100, null, null) x where x.id = %L', p));
  if r ->> 'items' <> '4' or r ->> 'terminados' <> '2' or r ->> 'en_stock' <> '1' or r ->> 'pendientes' <> '1' then
    raise exception 'L2: las cuentas debían ser 4, 2, 1 y 1 y dieron %', r;
  end if;
  if r ->> 'vehiculo_titulo' is distinct from 'rp vehículo' then raise exception 'L2: quien ve el vehículo debía leer su título: %', r; end if;
  if r ? 'cliente_telefono' or r ? 'lead_id' then raise exception 'L2: la lista no debe traer el teléfono ni el vínculo: %', r; end if;
  r := pg_temp.rp_corre(ve, format('select to_jsonb(x) from public.repuestos_proyectos_listar(null, 100, null, null) x where x.id = %L', p));
  if r ->> 'id' is null or r ->> 'vehiculo_titulo' is not null then raise exception 'L2: sin vehiculos.ver el título debía ser nulo: %', r; end if;
end $$;
rollback;
