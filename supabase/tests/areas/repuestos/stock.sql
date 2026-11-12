-- El stock de un ítem de repuestos se mueve sólo por RPC (paso 8.10-1, C1–C2). No depende de otro archivo (`SOLO=areas/repuestos/stock.sql`); cada
-- bloque abre su transacción y la revierte. Reasignar está en `stock-reasignar.sql`, la lista en `stock-listar.sql` y la espera del vehículo con stock
-- en `esperas.sql` (E7), que ya tiene su terreno.
--
-- Qué asegura (el «Terminado» del 8.10):
--   S1. Entrar y salir: `sobrante` sube el stock y fija `en_stock_desde`; lo que entra no pasa de la cantidad menos lo ya entrado; una salida no pasa
--       del stock; al volver a 0, `en_stock_desde` se limpia. El stock nunca queda negativo.
--   S2. Stock esperado viejo → PT409 sin movimiento; motivo, cantidad, esperado y nota se validan con su hint; un proyecto cerrado mueve; un ítem
--       eliminado, PT409.
--   S3. Sin INSERT directo de movimientos ni UPDATE de `en_stock_desde` o `stock_cantidad` (42501); sin `repuestos.editar` no se mueve ni se reasigna;
--       sin `repuestos.ver` no se lee ningún movimiento.

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

-- @test repuestos: pasar a stock y sacar; lo que entra tiene tope y el stock nunca queda negativo (S1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ini uuid := pg_temp.rp_inicial(); p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); r jsonb; m record;
begin
  perform pg_temp.rp_ok('S1 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "Faro", "cantidad": 3}'));
  r := pg_temp.rp_ok('S1 sobrante 2', pg_temp.rps_mover(ed, i, 2, 'sobrante', 0));
  if pg_temp.rps_claves(r) <> array['actualizado_en', 'en_stock_desde', 'item_id', 'movimiento_id', 'stock_cantidad'] then
    raise exception 'S1: las claves de la respuesta no son las de C2: %', r;
  end if;
  if (r ->> 'stock_cantidad')::integer <> 2 or r ->> 'en_stock_desde' is null
     or (select en_stock_desde from public.repuestos_items where id = i) is null or pg_temp.rps_stock(i) <> 2 then
    raise exception 'S1: tras pasar 2 debía quedar stock 2 con en_stock_desde: %', r;
  end if;
  select * into m from public.repuestos_stock_movimientos where id = (r ->> 'movimiento_id')::bigint;
  if m.item_id <> i or m.cantidad <> 2 or m.motivo <> 'sobrante' or m.usuario_id <> ed or m.nota is not null then
    raise exception 'S1: el movimiento de entrada no es el esperado: %', to_jsonb(m);
  end if;
  perform pg_temp.rp_es('S1 sobrante sobre el disponible', pg_temp.rps_mover(ed, i, 2, 'sobrante', 2), '23514', 'cantidad',
    'Sólo puedes pasar 1 más de este ítem a stock.');
  perform pg_temp.rp_es('S1 vender más que el stock', pg_temp.rps_mover(ed, i, 3, 'vendido', 2), '23514', 'cantidad', 'Sólo hay 2 en stock.');
  if pg_temp.rps_stock(i) <> 2 or pg_temp.rps_movs(i) <> 1 then raise exception 'S1: un rechazo cambió el stock o dejó un movimiento'; end if;
  r := pg_temp.rp_ok('S1 vender 2', pg_temp.rps_mover(ed, i, 2, 'vendido', 2, '  A un taller  '));
  if pg_temp.rps_stock(i) <> 0 or (select en_stock_desde from public.repuestos_items where id = i) is not null or r ->> 'en_stock_desde' is not null then
    raise exception 'S1: al volver a 0 debía limpiarse en_stock_desde: %', r;
  end if;
  select * into m from public.repuestos_stock_movimientos where id = (r ->> 'movimiento_id')::bigint;
  if m.cantidad <> -2 or m.motivo <> 'vendido' or m.nota is distinct from 'A un taller' then
    raise exception 'S1: el movimiento de salida no es el esperado: %', to_jsonb(m);
  end if;
  perform pg_temp.rp_ok('S1 sobrante 1', pg_temp.rps_mover(ed, i, 1, 'sobrante', 0));
  perform pg_temp.rp_es('S1 ya pasó todo', pg_temp.rps_mover(ed, i, 1, 'sobrante', 1), '23514', 'cantidad', 'Este ítem ya pasó todo a stock.');
  perform pg_temp.rp_es('S1 salir de más', pg_temp.rps_mover(ed, i, 2, 'ajuste', 1), '23514', 'cantidad', 'Sólo hay 1 en stock.');
  if pg_temp.rps_stock(i) <> 1 or exists (select 1 from public.repuestos_items where stock_cantidad < 0) then
    raise exception 'S1: el stock debía quedar en 1 y nunca negativo';
  end if;
end $$;
rollback;

-- @test repuestos: el stock esperado viejo da PT409; motivo, cantidad, esperado y nota se validan; cerrado mueve, eliminado no (S2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ini uuid := pg_temp.rp_inicial(); p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('S2 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "Faro", "cantidad": 3}'));
  perform pg_temp.rp_ok('S2 sobrante', pg_temp.rps_mover(ed, i, 2, 'sobrante', 0));
  perform pg_temp.rp_es('S2 esperado viejo', pg_temp.rps_mover(ed, i, 1, 'vendido', 0), 'PT409', 'conflicto',
    'Otra persona movió el stock de este ítem. Recarga para ver lo nuevo.');
  perform pg_temp.rp_es('S2 reasignado', pg_temp.rps_mover(ed, i, 1, 'reasignado', 2), '22023', 'motivo');
  perform pg_temp.rp_es('S2 otro motivo', pg_temp.rps_mover(ed, i, 1, 'otro', 2), '22023', 'motivo', 'Ese motivo no existe.');
  perform pg_temp.rp_es('S2 sin motivo', pg_temp.rps_mover(ed, i, 1, null, 2), '22023', 'motivo');
  perform pg_temp.rp_es('S2 cantidad 0', pg_temp.rps_mover(ed, i, 0, 'vendido', 2), '22023', 'cantidad');
  perform pg_temp.rp_es('S2 cantidad negativa', pg_temp.rps_mover(ed, i, -1, 'sobrante', 2), '22023', 'cantidad');
  perform pg_temp.rp_es('S2 sin cantidad', pg_temp.rps_mover(ed, i, null, 'vendido', 2), '22023', 'cantidad');
  perform pg_temp.rp_es('S2 sin esperado', pg_temp.rps_mover(ed, i, 1, 'vendido', null), '22023', 'stock_esperado');
  perform pg_temp.rp_es('S2 nota larga', pg_temp.rps_mover(ed, i, 1, 'vendido', 2, repeat('x', 501)), '22023', 'nota');
  if pg_temp.rps_stock(i) <> 2 or pg_temp.rps_movs(i) <> 1 then raise exception 'S2: un rechazo cambió el stock o dejó un movimiento'; end if;
  perform pg_temp.rp_ok('S2 nota de 500 y vacía', pg_temp.rps_mover(ed, i, 1, 'devuelto', 2, '   '));
  if (select nota from public.repuestos_stock_movimientos where item_id = i and motivo = 'devuelto') is not null then
    raise exception 'S2: una nota en blanco debía guardarse nula';
  end if;
  perform pg_temp.rp_ok('S2 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', p,
    (select actualizado_en from public.repuestos_proyectos where id = p))));
  perform pg_temp.rp_ok('S2 mover en un proyecto cerrado', pg_temp.rps_mover(ed, i, 1, 'vendido', 1, repeat('x', 500)));
  perform pg_temp.rp_ok('S2 entrar en un proyecto cerrado', pg_temp.rps_mover(ed, i, 1, 'sobrante', 0));
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.rp_es('S2 ítem eliminado', pg_temp.rps_mover(ed, i, 1, 'vendido', 1), 'PT409', 'conflicto', 'Este ítem ya no existe.');
  perform pg_temp.rp_es('S2 ítem que no existe', pg_temp.rps_mover(ed, gen_random_uuid(), 1, 'vendido', 0), 'PT409', 'conflicto');
end $$;
rollback;

-- @test repuestos: sin INSERT de movimientos ni UPDATE de en_stock_desde o stock_cantidad; sin editar no mueve; sin ver no lee (S3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  nadie uuid := pg_temp.rp_persona(array['vehiculos.ver']);
  ini uuid := pg_temp.rp_inicial(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('S3 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "Faro", "cantidad": 3}'));
  perform pg_temp.rp_ok('S3 sobrante', pg_temp.rps_mover(ed, i, 2, 'sobrante', 0));
  perform pg_temp.rp_es('S3 insert directo', pg_temp.rp_corre(ed, format(
    'insert into public.repuestos_stock_movimientos (item_id, cantidad, motivo, usuario_id) values (%L, 5, %L, %L) returning to_jsonb(id)', i, 'sobrante', ed)),
    '42501', null);
  perform pg_temp.rp_es('S3 update en_stock_desde', pg_temp.rp_corre(ed, format(
    'with x as (update public.repuestos_items set en_stock_desde = null where id = %L returning 1) select to_jsonb(count(*)) from x', i)), '42501', null);
  perform pg_temp.rp_es('S3 update stock_cantidad', pg_temp.rp_corre(ed, format(
    'with x as (update public.repuestos_items set stock_cantidad = 50 where id = %L returning 1) select to_jsonb(count(*)) from x', i)), '42501', null);
  if has_table_privilege('authenticated', 'public.repuestos_stock_movimientos', 'INSERT')
     or has_column_privilege('authenticated', 'public.repuestos_items', 'en_stock_desde', 'UPDATE')
     or has_sequence_privilege('authenticated', 'public.repuestos_stock_movimientos_id_seq', 'USAGE')
     or has_function_privilege('authenticated', 'public._repuesto_stock_aplicar(public.repuestos_items, integer, text, text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._repuesto_stock_item(uuid)', 'EXECUTE') then
    raise exception 'S3: authenticated conserva un privilegio de escritura del stock';
  end if;
  perform pg_temp.rp_es('S3 mover sin editar', pg_temp.rps_mover(ve, i, 1, 'vendido', 2), '42501', null);
  perform pg_temp.rp_es('S3 reasignar sin editar', pg_temp.rps_reasignar(ve, i, q, 1, gen_random_uuid()), '42501', null);
  if pg_temp.rps_stock(i) <> 2 or pg_temp.rps_movs(i) <> 1 or (select en_stock_desde from public.repuestos_items where id = i) is null
     or exists (select 1 from public.repuestos_items where proyecto_id = q) then
    raise exception 'S3: sin repuestos.editar cambió el stock';
  end if;
  if pg_temp.rp_corre(ve, 'select to_jsonb(count(*)) from (select 1 from public.repuestos_stock_movimientos limit 1) x') <> '1'::jsonb then
    raise exception 'S3: con repuestos.ver debía leer el movimiento';
  end if;
  if pg_temp.rp_corre(nadie, 'select to_jsonb(count(*)) from (select 1 from public.repuestos_stock_movimientos limit 1) x') <> '0'::jsonb then
    raise exception 'S3: sin repuestos.ver se leyó un movimiento';
  end if;
end $$;
rollback;
