-- Reasignar el stock de un ítem de repuestos a otro proyecto es todo o nada (paso 8.10-1, C3). No depende de otro archivo
-- (`SOLO=areas/repuestos/stock-reasignar.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura (el «Terminado» del 8.10):
--   S4. Cada rechazo (destino cerrado, el mismo, eliminado, más que el stock) y una falla después de descontar dejan el origen igual. Con éxito: el
--       origen baja, el ítem nace en el destino en la fase inicial, idempotente por id; un id ajeno, 23505. (Postgres revierte toda la llamada ante
--       un error: estos casos guardan contra un `exception when` que atrape adentro, no prueban el orden de las escrituras.)

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

create or replace function pg_temp.rps_falla() returns trigger language plpgsql as $f$
begin
  raise exception 'rps falla después de descontar';
end $f$;

-- @test repuestos: reasignar es todo o nada; idempotente por id; el ítem nace en el destino en la fase inicial (S4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  otra uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ini uuid := pg_temp.rp_inicial();
  p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed); cerrado uuid := pg_temp.rp_proyecto(ed); muerto uuid := pg_temp.rp_proyecto(ed);
  i uuid := gen_random_uuid(); n uuid := gen_random_uuid(); n2 uuid := gen_random_uuid(); cond uuid; desde timestamptz; r jsonb; r2 jsonb; it record;
begin
  insert into public.repuestos_catalogos (catalogo, nombre) values ('condicion', 'rps usado') returning id into cond;
  perform pg_temp.rp_ok('S4 ítem', pg_temp.rp_item(ed, p, i,
    jsonb_build_object('descripcion', 'Faro', 'cantidad', 3, 'condicion_id', cond, 'precio_cliente', 10, 'moneda', 'usd')));
  perform pg_temp.rp_ok('S4 sobrante', pg_temp.rps_mover(ed, i, 2, 'sobrante', 0));
  desde := (select en_stock_desde from public.repuestos_items where id = i);
  perform pg_temp.rp_ok('S4 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', cerrado,
    (select actualizado_en from public.repuestos_proyectos where id = cerrado))));
  perform pg_temp.rp_ok('S4 eliminar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', muerto,
    (select actualizado_en from public.repuestos_proyectos where id = muerto))));

  perform pg_temp.rp_es('S4 destino cerrado', pg_temp.rps_reasignar(ed, i, cerrado, 1, gen_random_uuid()), '23514', 'proyecto',
    'El proyecto destino está cerrado: reábrelo para sumar ítems.');
  perform pg_temp.rp_es('S4 el mismo proyecto', pg_temp.rps_reasignar(ed, i, p, 1, gen_random_uuid()), '23514', 'proyecto');
  perform pg_temp.rp_es('S4 más que el stock', pg_temp.rps_reasignar(ed, i, q, 3, gen_random_uuid()), '23514', 'cantidad', 'Sólo hay 2 en stock.');
  perform pg_temp.rp_es('S4 destino eliminado', pg_temp.rps_reasignar(ed, i, muerto, 1, gen_random_uuid()), 'PT409', 'proyecto');
  perform pg_temp.rp_es('S4 sin id', pg_temp.rps_reasignar(ed, i, q, 1, null), '22023', 'id');
  perform pg_temp.rp_es('S4 sin destino', pg_temp.rps_reasignar(ed, i, null, 1, gen_random_uuid()), '22023', 'proyecto');
  perform pg_temp.rp_es('S4 cantidad 0', pg_temp.rps_reasignar(ed, i, q, 0, gen_random_uuid()), '22023', 'cantidad');
  -- Una falla después de descontar (el ítem nuevo no entra) revierte el descuento.
  create trigger rps_falla before insert on public.repuestos_items for each row execute function pg_temp.rps_falla();
  perform pg_temp.rp_es('S4 falla después de descontar', pg_temp.rps_reasignar(ed, i, q, 1, gen_random_uuid()), 'P0001', null);
  drop trigger rps_falla on public.repuestos_items;
  if pg_temp.rps_stock(i) <> 2 or pg_temp.rps_movs(i) <> 1
     or exists (select 1 from public.repuestos_items where proyecto_id in (q, cerrado, muerto)) then
    raise exception 'S4: un rechazo dejó el origen distinto o un ítem en el destino';
  end if;

  r := pg_temp.rp_ok('S4 reasignar 1', pg_temp.rps_reasignar(ed, i, q, 1, n));
  if pg_temp.rps_claves(r) <> array['fase_id', 'id', 'origen', 'proyecto_id']
     or pg_temp.rps_claves(r -> 'origen') <> array['actualizado_en', 'en_stock_desde', 'item_id', 'stock_cantidad'] then
    raise exception 'S4: las claves de la respuesta no son las de C3: %', r;
  end if;
  if (r ->> 'id')::uuid <> n or (r ->> 'proyecto_id')::uuid <> q or (r ->> 'fase_id')::uuid is distinct from ini
     or (r -> 'origen' ->> 'stock_cantidad')::integer <> 1 or pg_temp.rps_stock(i) <> 1
     or (select en_stock_desde from public.repuestos_items where id = i) is distinct from desde then
    raise exception 'S4: tras reasignar 1 el origen debía quedar en 1 con la misma fecha y el ítem nuevo en q: %', r;
  end if;
  if not exists (select 1 from public.repuestos_stock_movimientos where item_id = i and cantidad = -1 and motivo = 'reasignado' and usuario_id = ed
                   and nota = format('Al proyecto #%s.', (select numero from public.repuestos_proyectos where id = q))) then
    raise exception 'S4: falta el movimiento reasignado con su nota';
  end if;
  select * into it from public.repuestos_items where id = n;
  if it.cantidad <> 1 or it.descripcion <> 'Faro' or it.condicion_id is distinct from cond or it.precio_cliente is not null or it.moneda is not null
     or it.creado_por <> ed or it.fase_id is distinct from ini or it.stock_cantidad <> 0 or it.en_stock_desde is not null
     or it.notas is distinct from format('Reasignado desde el proyecto #%s.', (select numero from public.repuestos_proyectos where id = p)) then
    raise exception 'S4: el ítem nuevo no es el esperado: %', to_jsonb(it);
  end if;
  if (select count(*) from public.historial_fases where repuesto_id = n and de_fase_id is null and a_fase_id = ini) <> 1 then
    raise exception 'S4: el ítem nuevo debía nacer con su fila de historial';
  end if;
  r2 := pg_temp.rp_ok('S4 repetir', pg_temp.rps_reasignar(ed, i, q, 1, n));
  if (r2 ->> 'id')::uuid <> n or (r2 -> 'origen' ->> 'stock_cantidad')::integer <> 1 or pg_temp.rps_stock(i) <> 1
     or (select count(*) from public.repuestos_stock_movimientos where item_id = i and motivo = 'reasignado') <> 1 then
    raise exception 'S4: repetir con el mismo id no debía escribir: %', r2;
  end if;
  perform pg_temp.rp_es('S4 id ajeno', pg_temp.rps_reasignar(otra, i, q, 1, n), '23505', 'id');
  r := pg_temp.rp_ok('S4 reasignar el último', pg_temp.rps_reasignar(ed, i, q, 1, n2));
  if pg_temp.rps_stock(i) <> 0 or (select en_stock_desde from public.repuestos_items where id = i) is not null
     or r -> 'origen' ->> 'en_stock_desde' is not null then
    raise exception 'S4: reasignar el último debía dejar stock 0 sin en_stock_desde: %', r;
  end if;
end $$;
rollback;
