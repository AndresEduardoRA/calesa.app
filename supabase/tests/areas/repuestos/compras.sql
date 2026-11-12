-- Las compras de un proyecto de repuestos se escriben sólo por RPC y el monto en base lo pone la base (paso 8.11-1, C1–C8). No depende de otro archivo
-- (`SOLO=areas/repuestos/compras.sql`); cada bloque abre su transacción y la revierte. El margen está en `compras-margen.sql`.
--
-- Qué asegura (el «Terminado» del 8.11):
--   B1. `monto_base` lo pone la base con el tipo por defecto vigente, aunque el cliente mande otro (22023 y nada guardado ni cambiado).
--   B2. La tasa queda congelada: editar sólo el monto la conserva; cambiar la moneda toma la vigente.
--   B3. Sin INSERT, UPDATE ni DELETE directos (42501), ni policies ni privilegios de escritura para authenticated.
--   B4. Sin `repuestos.costos.ver` no se lee ninguna compra; sin `costos.editar` (o sin `repuestos.ver`) no se escribe.
--   B5. Versión (PT409) e idempotencia por id. B6. Validación con su hint. B7. Proyecto cerrado o eliminado; eliminar y restaurar.

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

create or replace function pg_temp.rp_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('proyecto', pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rp"}')));
  return i;
end $f$;

-- La moneda XTS (y las que pida `p_otras`) y los tipos de cambio de prueba. `p_directo`: XTS → base por defecto a 6,96.
create or replace function pg_temp.rpc_terreno(p_directo boolean default true) returns jsonb language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); v_base text; tc uuid; otro uuid;
begin
  select moneda_base::text into v_base from public.ajustes_empresa where id = 1;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X'), ('XTU', 'Prueba U', 'U'), ('XTV', 'Prueba V', 'V'),
    ('XTW', 'Prueba W', 'W')
  on conflict (codigo) do update set activa = true;
  if p_directo then
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default) values ('rpc_' || s, 'RPC', 'XTS', v_base, 6.96, true)
    returning id into tc;
  end if;
  -- Otro tipo XTS → base, activo pero no por defecto: nunca se toma solo.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default) values ('rpc_otro_' || s, 'RPC otro', 'XTS', v_base, 9, false)
  returning id into otro;
  return jsonb_build_object('base', v_base, 'tc', tc, 'otro', otro, 's', s);
end $f$;

create or replace function pg_temp.rpc_guardar(p_quien uuid, p_id uuid, p_datos jsonb, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_compra_guardar(%L::uuid, %L::jsonb, %L::timestamptz)', p_id, p_datos, p_esperada));
$f$;

create or replace function pg_temp.rpc_eliminar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_compra_eliminar(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rpc_restaurar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_compra_restaurar(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rpc_fila(p_id uuid) returns public.repuestos_compras language sql as $f$
  select * from public.repuestos_compras where id = p_id;
$f$;

create or replace function pg_temp.rpc_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.repuestos_compras where id = p_id;
$f$;

create or replace function pg_temp.rpc_claves(p jsonb) returns text[] language sql as $f$
  select array_agg(k order by k) from jsonb_object_keys(p) k;
$f$;

create or replace function pg_temp.rpc_todos() returns text[] language sql as $f$
  select array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar'];
$f$;

-- @test repuestos: el monto en base lo pone la base con el tipo por defecto vigente, aunque el cliente mande otro (B1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed);
  v_base text := t ->> 'base'; c uuid; c696 uuid := gen_random_uuid(); r jsonb; f public.repuestos_compras; antes public.repuestos_compras;
begin
  -- En la moneda base no hay tasa.
  c := gen_random_uuid();
  r := pg_temp.rp_ok('B1 base', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', v_base, 'monto', '120.50'), null));
  if pg_temp.rpc_claves(r) <> array['actualizado_en', 'id', 'monto_base', 'tipo_cambio_aplicado', 'ya_existia'] or (r ->> 'ya_existia')::boolean then
    raise exception 'B1: las claves de la respuesta no son las de C5: %', r;
  end if;
  f := pg_temp.rpc_fila(c);
  if f.monto_base <> 120.50 or f.tipo_cambio_aplicado is not null or f.tipo_cambio_id is not null or f.creado_por <> ed or f.fecha <> current_date then
    raise exception 'B1: en la moneda base monto_base = monto, sin tasa, con quién y hoy: %', to_jsonb(f);
  end if;
  -- (c) En XTS con el tipo por defecto XTS → base de 6,96: 100 da 696,00 (el «otro» de 9 no se toma).
  r := pg_temp.rp_ok('B1 XTS', pg_temp.rpc_guardar(ed, c696, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100), null));
  f := pg_temp.rpc_fila(c696);
  if f.monto_base <> 696.00 or f.tipo_cambio_aplicado <> 6.96 or f.tipo_cambio_id is distinct from (t ->> 'tc')::uuid
     or (r ->> 'monto_base')::numeric <> 696.00 or (r ->> 'tipo_cambio_aplicado')::numeric <> 6.96 then
    raise exception 'B1: 100 XTS debían dar 696,00 con la tasa 6,96 del tipo por defecto: % / %', r, to_jsonb(f);
  end if;
  -- (a) Al crear, el cliente que manda el monto en base o la tasa: 22023 y no se guarda nada.
  c := gen_random_uuid();
  perform pg_temp.rp_es('B1a monto_base al crear', pg_temp.rpc_guardar(ed, c,
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100, 'monto_base', 1), null), '22023', 'monto_base', 'No se cambia «monto_base».');
  perform pg_temp.rp_es('B1a tasa al crear', pg_temp.rpc_guardar(ed, c,
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100, 'tipo_cambio_aplicado', 1), null), '22023', 'tipo_cambio_aplicado');
  perform pg_temp.rp_es('B1a tipo al crear', pg_temp.rpc_guardar(ed, c,
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100, 'tipo_cambio_id', t ->> 'otro'), null), '22023', 'tipo_cambio_id');
  if exists (select 1 from public.repuestos_compras where id = c) then
    raise exception 'B1a: una creación rechazada dejó la compra';
  end if;
  -- (b) Al editar, lo mismo: 22023 y las tres columnas quedan como estaban.
  antes := pg_temp.rpc_fila(c696);
  perform pg_temp.rp_es('B1b monto_base al editar', pg_temp.rpc_guardar(ed, c696, '{"monto_base": 1}', antes.actualizado_en), '22023', 'monto_base');
  perform pg_temp.rp_es('B1b tasa al editar', pg_temp.rpc_guardar(ed, c696, '{"tipo_cambio_aplicado": 1, "monto": 5}', antes.actualizado_en),
    '22023', 'tipo_cambio_aplicado');
  perform pg_temp.rp_es('B1b tipo al editar', pg_temp.rpc_guardar(ed, c696, jsonb_build_object('tipo_cambio_id', t ->> 'otro'), antes.actualizado_en),
    '22023', 'tipo_cambio_id');
  f := pg_temp.rpc_fila(c696);
  if (f.monto, f.monto_base, f.tipo_cambio_aplicado, f.tipo_cambio_id, f.actualizado_en)
     is distinct from (antes.monto, antes.monto_base, antes.tipo_cambio_aplicado, antes.tipo_cambio_id, antes.actualizado_en) then
    raise exception 'B1b: una edición rechazada cambió la fila: % → %', to_jsonb(antes), to_jsonb(f);
  end if;
  -- Con sólo base → XTV por defecto, 696 XTV dan 100,00.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default) values ('rpc_inv_' || (t ->> 's'), 'RPC inv', v_base, 'XTV', 6.96, true);
  c := gen_random_uuid();
  perform pg_temp.rp_ok('B1 inverso', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTV', 'monto', 696), null));
  if (pg_temp.rpc_fila(c)).monto_base <> 100.00 or (pg_temp.rpc_fila(c)).tipo_cambio_aplicado <> 6.96 then
    raise exception 'B1: 696 XTV con base → XTV de 6,96 debían dar 100,00: %', to_jsonb(pg_temp.rpc_fila(c));
  end if;
  -- Sin tipo por defecto (XTU no tiene ninguno; XTW tiene uno activo que no es por defecto): 23502 hint moneda.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default) values ('rpc_w_' || (t ->> 's'), 'RPC w', 'XTW', v_base, 2, false);
  perform pg_temp.rp_es('B1 sin tipo', pg_temp.rpc_guardar(ed, gen_random_uuid(), jsonb_build_object('proyecto_id', p, 'moneda', 'XTU', 'monto', 1), null),
    '23502', 'moneda', format('No hay un tipo de cambio por defecto de XTU a %s: márcalo en los tipos de cambio de la empresa.', v_base));
  perform pg_temp.rp_es('B1 sin tipo por defecto', pg_temp.rpc_guardar(ed, gen_random_uuid(),
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTW', 'monto', 1), null), '23502', 'moneda');
  -- Un tipo por defecto desactivado no vale.
  update public.tipos_cambio set activo = false where id = (t ->> 'tc')::uuid;
  perform pg_temp.rp_es('B1 tipo desactivado', pg_temp.rpc_guardar(ed, gen_random_uuid(),
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null), '23502', 'moneda');
end $$;
rollback;

-- @test repuestos: la tasa queda congelada al editar el monto y se toma la vigente al cambiar la moneda (B2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed);
  c uuid := gen_random_uuid(); r jsonb; f public.repuestos_compras;
begin
  perform pg_temp.rp_ok('B2 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100), null));
  update public.tipos_cambio set valor = 7 where id = (t ->> 'tc')::uuid;
  r := pg_temp.rp_ok('B2 editar el monto', pg_temp.rpc_guardar(ed, c, '{"monto": 200}', pg_temp.rpc_version(c)));
  f := pg_temp.rpc_fila(c);
  if (r ->> 'sin_cambios')::boolean or f.tipo_cambio_aplicado <> 6.96 or f.monto_base <> 1392.00 or f.tipo_cambio_id is distinct from (t ->> 'tc')::uuid then
    raise exception 'B2: editar sólo el monto debía conservar la tasa 6,96 (1392,00): % / %', r, to_jsonb(f);
  end if;
  perform pg_temp.rp_ok('B2 a la base', pg_temp.rpc_guardar(ed, c, jsonb_build_object('moneda', t ->> 'base'), pg_temp.rpc_version(c)));
  f := pg_temp.rpc_fila(c);
  if f.tipo_cambio_aplicado is not null or f.tipo_cambio_id is not null or f.monto_base <> 200 then
    raise exception 'B2: en la moneda base no queda tasa: %', to_jsonb(f);
  end if;
  perform pg_temp.rp_ok('B2 de vuelta', pg_temp.rpc_guardar(ed, c, '{"moneda": "XTS"}', pg_temp.rpc_version(c)));
  f := pg_temp.rpc_fila(c);
  if f.tipo_cambio_aplicado <> 7 or f.monto_base <> 1400.00 then
    raise exception 'B2: volver a XTS debía tomar la tasa vigente 7 (1400,00): %', to_jsonb(f);
  end if;
end $$;
rollback;

-- @test repuestos: sin INSERT, UPDATE ni DELETE directos en las compras, ni policies ni privilegios de escritura (B3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); c uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('B3 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100), null));
  perform pg_temp.rp_es('B3 insert directo', pg_temp.rp_corre(ed, format(
    'insert into public.repuestos_compras (proyecto_id, moneda, monto, monto_base, creado_por) values (%L, %L, 1, 1, %L) returning to_jsonb(id)', p, 'XTS', ed)),
    '42501', null);
  perform pg_temp.rp_es('B3 update directo', pg_temp.rp_corre(ed, format(
    'with x as (update public.repuestos_compras set monto_base = 1 where id = %L returning 1) select to_jsonb(count(*)) from x', c)), '42501', null);
  perform pg_temp.rp_es('B3 delete directo', pg_temp.rp_corre(ed, format(
    'with x as (delete from public.repuestos_compras where id = %L returning 1) select to_jsonb(count(*)) from x', c)), '42501', null);
  if (pg_temp.rpc_fila(c)).monto_base <> 696.00 then raise exception 'B3: una escritura directa cambió la compra'; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'repuestos_compras' and cmd <> 'SELECT')
     or has_table_privilege('authenticated', 'public.repuestos_compras', 'INSERT')
     or has_table_privilege('authenticated', 'public.repuestos_compras', 'UPDATE')
     or has_table_privilege('authenticated', 'public.repuestos_compras', 'DELETE')
     or has_column_privilege('authenticated', 'public.repuestos_compras', 'monto_base', 'UPDATE')
     or has_column_privilege('authenticated', 'public.repuestos_compras', 'monto_base', 'INSERT') then
    raise exception 'B3: quedó una policy o un privilegio de escritura sobre repuestos_compras';
  end if;
  if pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_compras where id = %L', c)) <> '1'::jsonb then
    raise exception 'B3: el select con repuestos.costos.ver debía seguir leyendo la compra';
  end if;
end $$;
rollback;

-- @test repuestos: sin costos.ver no se lee ninguna compra; sin costos.editar o sin repuestos.ver no se escribe (B4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos());
  ve uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.costos.ver']);
  sin_ver uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.editar']);
  sin_editar uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.costos.ver']);
  sin_repuestos uuid := pg_temp.rp_persona(array['repuestos.costos.ver', 'repuestos.costos.editar']);
  t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); c uuid := gen_random_uuid(); d uuid := gen_random_uuid(); v timestamptz;
begin
  perform pg_temp.rp_ok('B4 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100), null));
  if pg_temp.rp_corre(ve, format('select to_jsonb(count(*)) from public.repuestos_compras where proyecto_id = %L', p)) <> '1'::jsonb then
    raise exception 'B4: con costos.ver la compra viva se debía leer (control positivo)';
  end if;
  if pg_temp.rp_corre(sin_ver, format('select to_jsonb(count(*)) from public.repuestos_compras where proyecto_id = %L', p)) <> '0'::jsonb then
    raise exception 'B4: sin costos.ver no se debía leer ninguna compra';
  end if;
  v := pg_temp.rpc_version(c);
  perform pg_temp.rp_es('B4 guardar sin editar', pg_temp.rpc_guardar(sin_editar, d, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null),
    '42501', null);
  perform pg_temp.rp_es('B4 editar sin editar', pg_temp.rpc_guardar(sin_editar, c, '{"monto": 1}', v), '42501', null);
  perform pg_temp.rp_es('B4 eliminar sin editar', pg_temp.rpc_eliminar(sin_editar, c, v), '42501', null);
  perform pg_temp.rp_es('B4 restaurar sin editar', pg_temp.rpc_restaurar(sin_editar, c, v), '42501', null);
  perform pg_temp.rp_es('B4 guardar sin repuestos.ver', pg_temp.rpc_guardar(sin_repuestos, d,
    jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null), '42501', null);
  perform pg_temp.rp_es('B4 eliminar sin repuestos.ver', pg_temp.rpc_eliminar(sin_repuestos, c, v), '42501', null);
  perform pg_temp.rp_es('B4 restaurar sin repuestos.ver', pg_temp.rpc_restaurar(sin_repuestos, c, v), '42501', null);
  if (pg_temp.rpc_fila(c)).eliminado_en is not null or pg_temp.rpc_version(c) <> v or exists (select 1 from public.repuestos_compras where id = d) then
    raise exception 'B4: una llamada sin permiso escribió';
  end if;
  -- Con costos.editar y repuestos.ver (sin costos.ver) sí escribe: la escritura no pide leer la lista.
  perform pg_temp.rp_ok('B4 guardar con editar', pg_temp.rpc_guardar(sin_ver, d, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null));
end $$;
rollback;

-- @test repuestos: una versión vieja da PT409; crear es idempotente por id y nunca pisa; la versión se mueve dos veces en una transacción (B5)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  c uuid := gen_random_uuid(); r jsonb; v0 timestamptz; v1 timestamptz; v2 timestamptz;
begin
  perform pg_temp.rp_ok('B5 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 100, 'proveedor', 'Acme'), null));
  v0 := pg_temp.rpc_version(c);
  r := pg_temp.rp_ok('B5 reintento', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 999), null));
  if not (r ->> 'ya_existia')::boolean or (r ->> 'monto_base')::numeric <> 696.00 or (pg_temp.rpc_fila(c)).monto <> 100 then
    raise exception 'B5: el reintento con el mismo id debía devolver lo guardado sin pisar: %', r;
  end if;
  perform pg_temp.rp_es('B5 id de otro proyecto', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', q, 'moneda', 'XTS', 'monto', 1), null),
    '23505', 'id', 'Ese id ya es de otra compra.');
  r := pg_temp.rp_ok('B5 sin cambios', pg_temp.rpc_guardar(ed, c, '{"monto": 100, "proveedor": " Acme "}', v0 - interval '1 second'));
  if not (r ->> 'sin_cambios')::boolean or pg_temp.rpc_version(c) <> v0 then
    raise exception 'B5: sin cambios no mira la versión ni escribe: %', r;
  end if;
  r := pg_temp.rp_ok('B5 editar', pg_temp.rpc_guardar(ed, c, '{"monto": 50}', v0));
  v1 := (r ->> 'actualizado_en')::timestamptz;
  r := pg_temp.rp_ok('B5 editar otra vez', pg_temp.rpc_guardar(ed, c, '{"monto": 60}', v1));
  v2 := (r ->> 'actualizado_en')::timestamptz;
  if not (v0 < v1 and v1 < v2) or pg_temp.rpc_version(c) <> v2 then
    raise exception 'B5: dos ediciones en la misma transacción debían mover la versión dos veces: % % %', v0, v1, v2;
  end if;
  perform pg_temp.rp_es('B5 versión vieja', pg_temp.rpc_guardar(ed, c, '{"monto": 70}', v1), 'PT409', null,
    'Otra persona cambió esta compra. Recarga para ver lo nuevo.');
  perform pg_temp.rp_es('B5 eliminar con versión vieja', pg_temp.rpc_eliminar(ed, c, v1), 'PT409', null);
  if (pg_temp.rpc_fila(c)).monto <> 60 or (pg_temp.rpc_fila(c)).eliminado_en is not null then raise exception 'B5: un PT409 cambió la fila'; end if;
  perform pg_temp.rp_es('B5 esperada sobre un id que no existe', pg_temp.rpc_guardar(ed, gen_random_uuid(), '{"monto": 1}', v2), 'PT409', 'conflicto',
    'Esta compra ya no existe.');
  perform pg_temp.rp_ok('B5 eliminar', pg_temp.rpc_eliminar(ed, c, v2));
  perform pg_temp.rp_es('B5 editar una eliminada', pg_temp.rpc_guardar(ed, c, '{"monto": 1}', pg_temp.rpc_version(c)), 'PT409', 'conflicto');
  perform pg_temp.rp_es('B5 reintento de una eliminada', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null),
    'PT409', 'conflicto');
  perform pg_temp.rp_es('B5 eliminar otra vez', pg_temp.rpc_eliminar(ed, c, pg_temp.rpc_version(c)), 'PT409', 'conflicto');
end $$;
rollback;

-- @test repuestos: los datos de una compra se validan, cada uno con su hint (B6)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  c uuid := gen_random_uuid(); i uuid; iq uuid; ie uuid; d jsonb; f public.repuestos_compras; v_ruta text;
begin
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rp ítem') returning id into i;
  insert into public.repuestos_items (proyecto_id, descripcion) values (q, 'rp ítem de otro') returning id into iq;
  insert into public.repuestos_items (proyecto_id, descripcion, eliminado_en) values (p, 'rp ítem eliminado', now()) returning id into ie;
  d := jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 10);
  perform pg_temp.rp_es('B6 negativo', pg_temp.rpc_guardar(ed, c, d || '{"monto": -1}', null), '22023', 'monto');
  perform pg_temp.rp_es('B6 tres decimales', pg_temp.rpc_guardar(ed, c, d || '{"monto": "1.005"}', null), '22023', 'monto',
    'El monto lleva como mucho dos decimales.');
  perform pg_temp.rp_es('B6 monto no numérico', pg_temp.rpc_guardar(ed, c, d || '{"monto": "diez"}', null), '22023', 'monto');
  perform pg_temp.rp_es('B6 sin monto', pg_temp.rpc_guardar(ed, c, d - 'monto', null), '23502', 'monto');
  perform pg_temp.rp_es('B6 sin moneda', pg_temp.rpc_guardar(ed, c, d - 'moneda', null), '23502', 'moneda');
  perform pg_temp.rp_es('B6 moneda que no existe', pg_temp.rpc_guardar(ed, c, d || '{"moneda": "QQQQ"}', null), '22023', 'moneda');
  update public.monedas set activa = false where codigo = 'XTU';
  perform pg_temp.rp_es('B6 moneda inactiva', pg_temp.rpc_guardar(ed, c, d || '{"moneda": "XTU"}', null), '22023', 'moneda', 'Elige una moneda activa.');
  perform pg_temp.rp_es('B6 ítem de otro proyecto', pg_temp.rpc_guardar(ed, c, d || jsonb_build_object('item_id', iq), null), '22023', 'item_id',
    'Ese ítem no es de este proyecto.');
  perform pg_temp.rp_es('B6 ítem eliminado', pg_temp.rpc_guardar(ed, c, d || jsonb_build_object('item_id', ie), null), '22023', 'item_id');
  perform pg_temp.rp_es('B6 comprobante fuera de la carpeta', pg_temp.rpc_guardar(ed, c,
    d || jsonb_build_object('comprobante_ruta', q || '/' || repeat('a', 64) || '.pdf'), null), '22023', 'comprobante_ruta');
  perform pg_temp.rp_es('B6 proveedor largo', pg_temp.rpc_guardar(ed, c, d || jsonb_build_object('proveedor', repeat('x', 201)), null), '22023', 'proveedor');
  perform pg_temp.rp_es('B6 notas largas', pg_temp.rpc_guardar(ed, c, d || jsonb_build_object('notas', repeat('x', 2001)), null), '22023', 'notas');
  perform pg_temp.rp_es('B6 clave desconocida', pg_temp.rpc_guardar(ed, c, d || '{"creado_por": null}', null), '22023', 'creado_por');
  perform pg_temp.rp_es('B6 datos que no son objeto', pg_temp.rpc_guardar(ed, c, '[1]', null), '22023', 'datos');
  perform pg_temp.rp_es('B6 sin proyecto', pg_temp.rpc_guardar(ed, c, d - 'proyecto_id', null), '23502', 'proyecto_id');
  perform pg_temp.rp_es('B6 sin id', pg_temp.rpc_guardar(ed, null, d, null), '23502', 'id');
  if exists (select 1 from public.repuestos_compras where id = c) then raise exception 'B6: un rechazo dejó la compra'; end if;
  -- Lo válido: proveedor recortado, vacío es nulo, el comprobante en la carpeta del proyecto y un ítem del mismo proyecto.
  v_ruta := p || '/' || repeat('b', 64) || '.pdf';
  perform pg_temp.rp_ok('B6 válida', pg_temp.rpc_guardar(ed, c, d || jsonb_build_object('item_id', i, 'proveedor', '  Acme  ', 'notas', '   ',
    'comprobante_ruta', v_ruta, 'fecha', '2026-11-01'), null));
  f := pg_temp.rpc_fila(c);
  if f.proveedor <> 'Acme' or f.notas is not null or f.comprobante_ruta <> v_ruta or f.item_id <> i or f.fecha <> date '2026-11-01' then
    raise exception 'B6: la compra válida no quedó como se pidió: %', to_jsonb(f);
  end if;
  perform pg_temp.rp_es('B6 cambiar de proyecto', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', q), f.actualizado_en), '22023', 'proyecto_id',
    'Una compra no cambia de proyecto.');
  perform pg_temp.rp_es('B6 fecha nula', pg_temp.rpc_guardar(ed, c, '{"fecha": null}', f.actualizado_en), '23502', 'fecha');
  perform pg_temp.rp_es('B6 ítem cambiado a otro proyecto', pg_temp.rpc_guardar(ed, c, jsonb_build_object('item_id', iq), f.actualizado_en), '22023', 'item_id');
  perform pg_temp.rp_ok('B6 sin ítem', pg_temp.rpc_guardar(ed, c, '{"item_id": null}', f.actualizado_en));
  if (pg_temp.rpc_fila(c)).item_id is not null then raise exception 'B6: quitar el ítem debía dejarlo nulo'; end if;
end $$;
rollback;

-- @test repuestos: proyecto cerrado o eliminado; eliminar y restaurar; restaurar con el ítem eliminado; eliminar el proyecto con compras (B7)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  c uuid := gen_random_uuid(); ci uuid := gen_random_uuid(); cq uuid := gen_random_uuid(); i uuid; r jsonb; v timestamptz;
begin
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rp ítem') returning id into i;
  perform pg_temp.rp_ok('B7 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 10), null));
  perform pg_temp.rp_ok('B7 crear con ítem', pg_temp.rpc_guardar(ed, ci, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 5, 'item_id', i), null));
  -- Eliminar y restaurar: la eliminada no se lee y la restaurada sí.
  r := pg_temp.rp_ok('B7 eliminar', pg_temp.rpc_eliminar(ed, c, pg_temp.rpc_version(c)));
  if pg_temp.rpc_claves(r) <> array['actualizado_en', 'id'] or (pg_temp.rpc_fila(c)).eliminado_en is null
     or pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_compras where id = %L', c)) <> '0'::jsonb then
    raise exception 'B7: la eliminada no se debía leer: %', r;
  end if;
  perform pg_temp.rp_es('B7 restaurar con versión vieja', pg_temp.rpc_restaurar(ed, c, (r ->> 'actualizado_en')::timestamptz - interval '1 second'),
    'PT409', null);
  perform pg_temp.rp_ok('B7 restaurar', pg_temp.rpc_restaurar(ed, c, (r ->> 'actualizado_en')::timestamptz));
  if pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_compras where id = %L', c)) <> '1'::jsonb then
    raise exception 'B7: la restaurada se debía leer';
  end if;
  v := pg_temp.rpc_version(c);
  r := pg_temp.rp_ok('B7 restaurar una viva', pg_temp.rpc_restaurar(ed, c, v - interval '1 second'));
  if pg_temp.rpc_version(c) <> v then raise exception 'B7: restaurar una viva no escribe'; end if;
  -- Eliminar la compra, eliminar su ítem y restaurar la compra: 23514 hint item_id.
  perform pg_temp.rp_ok('B7 eliminar la del ítem', pg_temp.rpc_eliminar(ed, ci, pg_temp.rpc_version(ci)));
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.rp_es('B7 restaurar con el ítem eliminado', pg_temp.rpc_restaurar(ed, ci, pg_temp.rpc_version(ci)), '23514', 'item_id',
    'El ítem de esta compra se eliminó: restáuralo o registra la compra sin ítem.');
  if (pg_temp.rpc_fila(ci)).eliminado_en is null then raise exception 'B7: el rechazo restauró la compra'; end if;
  -- Proyecto cerrado: 23514 hint proyecto al guardar, eliminar y restaurar.
  perform pg_temp.rp_ok('B7 eliminar antes de cerrar', pg_temp.rpc_eliminar(ed, c, pg_temp.rpc_version(c)));
  perform pg_temp.rp_ok('B7 otra viva', pg_temp.rpc_guardar(ed, cq, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null));
  update public.repuestos_proyectos set cerrado_en = now() where id = p;
  perform pg_temp.rp_es('B7 crear en cerrado', pg_temp.rpc_guardar(ed, gen_random_uuid(), jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 1), null),
    '23514', 'proyecto', 'El proyecto está cerrado: reábrelo para registrar compras.');
  perform pg_temp.rp_es('B7 editar en cerrado', pg_temp.rpc_guardar(ed, cq, '{"monto": 2}', pg_temp.rpc_version(cq)), '23514', 'proyecto');
  perform pg_temp.rp_es('B7 eliminar en cerrado', pg_temp.rpc_eliminar(ed, cq, pg_temp.rpc_version(cq)), '23514', 'proyecto');
  perform pg_temp.rp_es('B7 restaurar en cerrado', pg_temp.rpc_restaurar(ed, c, pg_temp.rpc_version(c)), '23514', 'proyecto');
  -- Proyecto eliminado: PT409.
  update public.repuestos_proyectos set eliminado_en = now() where id = q;
  perform pg_temp.rp_es('B7 crear en eliminado', pg_temp.rpc_guardar(ed, gen_random_uuid(), jsonb_build_object('proyecto_id', q, 'moneda', 'XTS', 'monto', 1), null),
    'PT409', 'conflicto', 'Este proyecto ya no existe.');
  perform pg_temp.rp_es('B7 crear en un proyecto que no existe', pg_temp.rpc_guardar(ed, gen_random_uuid(),
    jsonb_build_object('proyecto_id', gen_random_uuid(), 'moneda', 'XTS', 'monto', 1), null), 'PT409', 'conflicto');
end $$;
rollback;

-- @test repuestos: eliminar el proyecto sigue rechazando con una compra viva y deja con la compra eliminada (B7)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); t jsonb := pg_temp.rpc_terreno(); p uuid := pg_temp.rp_proyecto(ed); c uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('B7 crear', pg_temp.rpc_guardar(ed, c, jsonb_build_object('proyecto_id', p, 'moneda', 'XTS', 'monto', 10), null));
  perform pg_temp.rp_es('B7 eliminar el proyecto con compra', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', p,
    (select actualizado_en from public.repuestos_proyectos where id = p))), '23514', 'en_uso');
  perform pg_temp.rp_ok('B7 eliminar la compra', pg_temp.rpc_eliminar(ed, c, pg_temp.rpc_version(c)));
  perform pg_temp.rp_ok('B7 eliminar el proyecto', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', p,
    (select actualizado_en from public.repuestos_proyectos where id = p))));
end $$;
rollback;

-- @test repuestos: sin repuestos.costos.ver el margen del proyecto da 42501 (B8)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpc_todos()); sin_costos uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.costos.editar']);
  p uuid := pg_temp.rp_proyecto(ed);
begin
  perform pg_temp.rp_ok('B8 con costos.ver', pg_temp.rp_corre(ed, format('select public.repuestos_proyecto_margen(%L::uuid)', p)));
  perform pg_temp.rp_es('B8 sin costos.ver', pg_temp.rp_corre(sin_costos, format('select public.repuestos_proyecto_margen(%L::uuid)', p)), '42501', null);
end $$;
rollback;
