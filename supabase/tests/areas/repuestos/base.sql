-- La base de repuestos: el ítem nace por RPC en la fase inicial, no se escribe directo y no se lee sin permiso (paso 8.08-1, C4–C9, C11). No depende
-- de otro archivo (`SOLO=areas/repuestos/base.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura (el «Terminado» del 8.08):
--   B1. El ítem nace en la única inicial activa con una fila de historial (de nulo a la inicial, quien crea, el flujo de repuestos); con dos iniciales,
--       nace sin fase y sin historial.
--   B2. INSERT directo → 42501; `fase_id` en los datos, un catálogo de otro tipo, un precio sin moneda y un proyecto cerrado dan su error con su hint;
--       sin `repuestos.editar`, crear y eliminar dan 42501 y no escriben.
--   B3. Eliminar con compras → 23514 «Tiene compras. Pásalo a stock o márcalo perdido.»; con otra fase, «Ya pasó por otra fase. …»; recién nacido, se
--       elimina; versión vieja, PT409.
--   B4. Sin `repuestos.ver` (ni `logistica.ver`) no se lee nada: ni las tablas ni las RPC de lectura.
--   B5. Ninguna lectura de ítems o proyectos trae un costo: ni las columnas que `authenticated` lee ni las salidas de las RPC de lectura.

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

create or replace function pg_temp.rp_borrar(p_quien uuid, p_item uuid, p_esperado timestamptz) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_item_eliminar(%L, %L)', p_item, p_esperado));
$f$;

-- @test repuestos: el ítem nace en la inicial con su historial; con dos iniciales, sin fase (B1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ini uuid := pg_temp.rp_inicial(); p uuid := pg_temp.rp_proyecto(ed);
  i uuid := gen_random_uuid(); j uuid := gen_random_uuid(); r jsonb; h record;
begin
  r := pg_temp.rp_ok('B1 crear', pg_temp.rp_item(ed, p, i, '{"descripcion": " Faro izquierdo ", "cantidad": 2}'));
  if (r ->> 'fase_id')::uuid is distinct from ini then raise exception 'B1: debía nacer en la inicial y dio %', r; end if;
  if (pg_temp.rp_item(ed, p, i, '{"descripcion": "otra"}')) is distinct from r then raise exception 'B1: el mismo id debía dar la misma respuesta'; end if;
  if not exists (select 1 from public.repuestos_items where id = i and fase_id = ini and fase_desde is not null and descripcion = 'Faro izquierdo'
                 and cantidad = 2 and creado_por = ed) then
    raise exception 'B1: el ítem no quedó en la inicial, con su fecha, su descripción recortada y su creador';
  end if;
  if (select count(*) from public.historial_fases where repuesto_id = i) <> 1 then raise exception 'B1: debía tener una sola fila de historial'; end if;
  select * into h from public.historial_fases where repuesto_id = i;
  if h.de_fase_id is not null or h.a_fase_id <> ini or h.usuario_id <> ed or h.flujo_id <> pg_temp.rp_flujo() then
    raise exception 'B1: la fila de historial no es la del nacimiento: %', to_jsonb(h);
  end if;
  -- Dos iniciales activas: nada que decidir por la persona, nace sin fase.
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (pg_temp.rp_flujo(), 'rp otra inicial', 1002, true);
  r := pg_temp.rp_ok('B1 dos iniciales', pg_temp.rp_item(ed, p, j, '{"descripcion": "Faro derecho"}'));
  if r ->> 'fase_id' is not null or exists (select 1 from public.historial_fases where repuesto_id = j) then
    raise exception 'B1: con dos iniciales debía nacer sin fase y sin historial: %', r;
  end if;
end $$;
rollback;

-- @test repuestos: sin INSERT directo; los datos se validan con su hint; un proyecto cerrado no recibe ítems; sin editar no escribe (B2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  ini uuid := pg_temp.rp_inicial(); p uuid := pg_temp.rp_proyecto(ed);
  cond uuid; i uuid := gen_random_uuid(); t timestamptz;
begin
  insert into public.repuestos_catalogos (catalogo, nombre) values ('condicion', 'rp usado') returning id into cond;
  perform pg_temp.rp_es('B2 insert directo', pg_temp.rp_corre(ed, format(
    'insert into public.repuestos_items (proyecto_id, descripcion, creado_por) values (%L, %L, %L) returning to_jsonb(id)', p, 'x', ed)), '42501', null);
  perform pg_temp.rp_es('B2 insert directo con fase', pg_temp.rp_corre(ed, format(
    'insert into public.repuestos_items (proyecto_id, descripcion, creado_por, fase_id, stock_cantidad) values (%L, %L, %L, %L, 5) returning to_jsonb(id)',
    p, 'x', ed, ini)), '42501', null);
  perform pg_temp.rp_es('B2 fase_id', pg_temp.rp_item(ed, p, gen_random_uuid(), jsonb_build_object('descripcion', 'x', 'fase_id', ini)), '22023', 'fase_id');
  perform pg_temp.rp_es('B2 sin descripción', pg_temp.rp_item(ed, p, gen_random_uuid(), '{"descripcion": "  "}'), '22023', 'descripcion');
  perform pg_temp.rp_es('B2 catálogo de otro tipo', pg_temp.rp_item(ed, p, gen_random_uuid(), jsonb_build_object('descripcion', 'x', 'tipo_pieza_id', cond)),
    '22023', 'tipo_pieza_id', 'Ese valor ya no está en el catálogo.');
  perform pg_temp.rp_es('B2 cantidad 0', pg_temp.rp_item(ed, p, gen_random_uuid(), '{"descripcion": "x", "cantidad": 0}'), '22023', 'cantidad');
  perform pg_temp.rp_es('B2 precio sin moneda', pg_temp.rp_item(ed, p, gen_random_uuid(), '{"descripcion": "x", "precio_cliente": 10}'), '22023', 'moneda');
  perform pg_temp.rp_ok('B2 con su catálogo', pg_temp.rp_item(ed, p, gen_random_uuid(),
    jsonb_build_object('descripcion', 'x', 'condicion_id', cond, 'precio_cliente', 10, 'moneda', 'usd')));
  -- Sin repuestos.editar: ni crea ni elimina.
  t := (pg_temp.rp_ok('B2 crear', pg_temp.rp_item(ed, p, i, '{"descripcion": "y"}')) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rp_es('B2 crear sin editar', pg_temp.rp_item(ve, p, gen_random_uuid(), '{"descripcion": "z"}'), '42501', null);
  perform pg_temp.rp_es('B2 eliminar sin editar', pg_temp.rp_borrar(ve, i, t), '42501', null);
  if exists (select 1 from public.repuestos_items where creado_por = ve) or (select eliminado_en from public.repuestos_items where id = i) is not null then
    raise exception 'B2: sin repuestos.editar se escribió un ítem';
  end if;
  -- Cerrado: no suma ítems.
  perform pg_temp.rp_ok('B2 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', p,
    (select actualizado_en from public.repuestos_proyectos where id = p))));
  perform pg_temp.rp_es('B2 proyecto cerrado', pg_temp.rp_item(ed, p, gen_random_uuid(), '{"descripcion": "x"}'), '23514', 'proyecto',
    'El proyecto está cerrado: reábrelo para sumar ítems.');
end $$;
rollback;

-- @test repuestos: eliminar un ítem con compras u otra fase se rechaza con su motivo; recién nacido, se elimina (B3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ini uuid := pg_temp.rp_inicial(); otra uuid; p uuid := pg_temp.rp_proyecto(ed);
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); ta timestamptz; tb timestamptz; tc timestamptz;
begin
  insert into public.fases (flujo_id, nombre, orden) values (pg_temp.rp_flujo(), 'rp segunda', 1003) returning id into otra;
  ta := (pg_temp.rp_ok('B3 a', pg_temp.rp_item(ed, p, a, '{"descripcion": "a"}')) ->> 'actualizado_en')::timestamptz;
  tb := (pg_temp.rp_ok('B3 b', pg_temp.rp_item(ed, p, b, '{"descripcion": "b"}')) ->> 'actualizado_en')::timestamptz;
  tc := (pg_temp.rp_ok('B3 c', pg_temp.rp_item(ed, p, c, '{"descripcion": "c"}')) ->> 'actualizado_en')::timestamptz;
  insert into public.repuestos_compras (proyecto_id, item_id, moneda, monto) values (p, a, 'USD', 10);
  perform pg_temp.rp_es('B3 con compras', pg_temp.rp_borrar(ed, a, ta), '23514', 'en_uso', 'Tiene compras. Pásalo a stock o márcalo perdido.');
  insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id) values (pg_temp.rp_flujo(), b, ini, otra);
  perform pg_temp.rp_es('B3 otra fase', pg_temp.rp_borrar(ed, b, tb), '23514', 'en_uso', 'Ya pasó por otra fase. Pásalo a stock o márcalo perdido.');
  perform pg_temp.rp_es('B3 versión vieja', pg_temp.rp_borrar(ed, c, tc - interval '1 second'), 'PT409', null);
  perform pg_temp.rp_ok('B3 recién nacido', pg_temp.rp_borrar(ed, c, tc));
  if pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_items where id = %L', c)) <> '0'::jsonb then
    raise exception 'B3: un ítem eliminado se sigue leyendo';
  end if;
  if (select eliminado_en from public.repuestos_items where id in (a, b) and eliminado_en is not null limit 1) is not null then
    raise exception 'B3: un rechazo eliminó un ítem';
  end if;
end $$;
rollback;

-- @test repuestos: sin repuestos.ver no se lee nada (B4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  nadie uuid := pg_temp.rp_persona(array['vehiculos.ver']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); q text;
begin
  perform pg_temp.rp_ok('B4 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  insert into public.repuestos_items_imagenes (item_id, ruta) values (i, 'repuestos/rp.webp');
  foreach q in array array['repuestos_items', 'repuestos_proyectos', 'repuestos_items_imagenes'] loop
    if pg_temp.rp_corre(nadie, format('select to_jsonb(count(*)) from (select 1 from public.%I limit 5) x', q)) <> '0'::jsonb then
      raise exception 'B4: sin repuestos.ver se lee %', q;
    end if;
    if pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from (select 1 from public.%I limit 5) x', q)) = '0'::jsonb then
      raise exception 'B4: con repuestos.ver no se lee %', q;
    end if;
  end loop;
end $$;
rollback;

-- @test repuestos: ninguna lectura de ítems o proyectos trae un costo (B5)
begin;
do $$
declare v_cols text;
begin
  select string_agg(c.table_name || '.' || c.column_name, ', ') into v_cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name in ('repuestos_items', 'repuestos_proyectos')
    and has_column_privilege('authenticated', format('public.%I', c.table_name), c.column_name, 'select')
    and c.column_name ~ '(costo|monto|margen|tipo_cambio|compra)';
  if v_cols is not null then raise exception 'B5: authenticated lee columnas de costo: %', v_cols; end if;
end $$;
rollback;
