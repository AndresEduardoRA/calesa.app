-- Gastos en la base (paso 6.10-1): el monto en moneda base lo calcula la base. No depende de otro archivo (`SOLO=areas/dinero/gastos.sql`). Cada bloque abre
-- su transacción y la revierte. `prorratear.sql`, `pagos.sql` y `escritura-directa.sql` copian estos ayudantes.
--
-- Qué asegura:
--   G1. 100 XTS con el tipo XTS → base de 6,96 guardan 696,00 (y la tasa y el tipo elegido); 33,33 da 231,98 (redondea, no trunca).
--   G2. En la moneda base, monto_base = monto y sin tipo; con tipo, 22023. Otra moneda sin tipo, 23502; un tipo inactivo o de otro par, 22023. Con un tipo
--       base → XTS de 6,96, 696 XTS dan 100,00 y 100 XTS dan 14,37.
--   G2b. Un monto con tres decimales, 22023 con hint `monto`.
--   G3. Sin `logistica.gastos.editar` del origen del vehículo (la tiene en otro), 42501 y ninguna fila; con la regla `gastos` apagada, 23514.
--   G4. El mismo id dos veces da una fila y `ya_existia`; el mismo id en otra unidad, 23505; un id ya borrado, PT409.
--   G7. Quien tiene `logistica.gastos.ver` sólo en otro origen no lee el gasto.

create or replace function pg_temp.din_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'din-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('din_' || substr(v_id::text, 1, 8), 'DIN ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes con un vehículo cada uno, una categoría, la moneda XTS y dos tipos: XTS → base y base → XTS, los dos en 6,96.
create or replace function pg_temp.din_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; v uuid; v2 uuid; v3 uuid; cat uuid; trib uuid; tc uuid; tc_inv uuid; s text := substr(gen_random_uuid()::text, 1, 8);
  v_base text := (select moneda_base::text from public.ajustes_empresa where id = 1);
begin
  insert into public.origenes (clave, nombre) values ('din_' || s, 'DIN origen ' || s) returning id into o;
  insert into public.origenes (clave, nombre) values ('din2_' || s, 'DIN origen 2 ' || s) returning id into o2;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo 3', 'nissan') returning id into v3;
  insert into public.vehiculos (origen_id, titulo, marca) values (o2, 'DIN vehículo 2', 'mazda') returning id into v2;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN flete ' || s, 'flete') returning id into cat;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN tributos ' || s, 'tributos') returning id into trib;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict do nothing;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_' || s, 'DIN', 'XTS', v_base, 6.96) returning id into tc;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_inv_' || s, 'DIN inverso', v_base, 'XTS', 6.96) returning id into tc_inv;
  return jsonb_build_object('o', o, 'o2', o2, 'v', v, 'v2', v2, 'v3', v3, 'cat', cat, 'trib', trib, 'tc', tc, 'tc_inv', tc_inv, 'base', v_base);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.din_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.din_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- Registrar un gasto de vehículo como esa persona.
create or replace function pg_temp.din_gasto(p_quien uuid, p_id uuid, p_vehiculo uuid, p_cat uuid, p_moneda text, p_monto numeric, p_tc uuid)
returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.gasto_registrar(%L, %L, null, %L, %L, %s, %L, null, null, null, null)',
                                           p_id, p_vehiculo, p_cat, p_moneda, p_monto, p_tc));
$f$;

-- @test dinero: la base calcula el monto en moneda base con el tipo elegido, en los dos sentidos, y redondea (G1, G2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; r jsonb; g public.gastos; v uuid; cat uuid; tc uuid;
begin
  p := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  v := (t ->> 'v')::uuid; cat := (t ->> 'cat')::uuid; tc := (t ->> 'tc')::uuid;
  r := pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 100, tc);
  select * into g from public.gastos where id = (r ->> 'id')::uuid;
  if g.monto_base is distinct from 696.00 or g.tipo_cambio_aplicado is distinct from 6.960000 or g.tipo_cambio_id is distinct from tc
     or (r ->> 'monto_base')::numeric <> 696.00 or (r ->> 'ya_existia')::boolean or g.creado_por is distinct from p then
    raise exception 'G1: 100 XTS a 6,96 debía guardar 696,00 con su tasa y su tipo; dio % / %', r, to_jsonb(g);
  end if;
  r := pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 33.33, tc);
  if (r ->> 'monto_base')::numeric is distinct from 231.98 then raise exception 'G1: 33,33 × 6,96 debía redondear a 231,98; dio %', r; end if;
  -- G2 · base → XTS divide.
  r := pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 696, (t ->> 'tc_inv')::uuid);
  if (r ->> 'monto_base')::numeric is distinct from 100.00 or (r ->> 'tipo_cambio_aplicado')::numeric is distinct from 6.96 then
    raise exception 'G2: 696 XTS con base → XTS de 6,96 debía dar 100,00; dio %', r;
  end if;
  r := pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 100, (t ->> 'tc_inv')::uuid);
  if (r ->> 'monto_base')::numeric is distinct from 14.37 then raise exception 'G2: 100 / 6,96 debía dar 14,37; dio %', r; end if;
  -- G2 · en la moneda base.
  r := pg_temp.din_gasto(p, gen_random_uuid(), v, cat, t ->> 'base', 250.5, null);
  if (r ->> 'monto_base')::numeric is distinct from 250.50 or r ->> 'tipo_cambio_aplicado' is not null then raise exception 'G2: en la base, monto_base = monto; dio %', r; end if;
  perform pg_temp.din_da('G2: la base con tipo', pg_temp.din_gasto(p, gen_random_uuid(), v, cat, t ->> 'base', 10, tc), '22023', 'tipo_cambio');
  perform pg_temp.din_da('G2: otra moneda sin tipo', pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 10, null), '23502', 'tipo_cambio');
  update public.tipos_cambio set activo = false where id = tc;
  perform pg_temp.din_da('G2: tipo inactivo', pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 10, tc), '22023', 'tipo_cambio');
  update public.tipos_cambio set activo = true where id = tc;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTT', 'Prueba 2', 'Y') on conflict do nothing;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_otro_' || substr(gen_random_uuid()::text, 1, 8), 'DIN otro', 'XTT', 'XTS', 2)
  returning id into tc;
  perform pg_temp.din_da('G2: tipo de otro par', pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 10, tc), '22023', 'tipo_cambio');
  -- G2b · tres decimales.
  perform pg_temp.din_da('G2b: tres decimales', pg_temp.din_gasto(p, gen_random_uuid(), v, cat, 'XTS', 33.335, (t ->> 'tc')::uuid), '22023', 'monto');
end $$;
reset role;
rollback;

-- @test dinero: registrar pide la clave del origen del vehículo y la regla gastos encendida (G3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); otro uuid; p uuid; gid uuid := gen_random_uuid();
begin
  otro := pg_temp.din_persona('logistica.gastos.editar:todos:' || (t ->> 'o2'), 'logistica.gastos.ver');
  perform pg_temp.din_da('G3: sin la clave del origen', pg_temp.din_gasto(otro, gid, (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid), '42501');
  if exists (select 1 from public.gastos g where g.id = gid) then raise exception 'G3: sin la clave dejó la fila'; end if;
  p := pg_temp.din_persona('logistica.gastos.editar');
  update public.flujos_reglas set activa = false where regla = 'gastos' and flujo_id = (select f.id from public.flujos f where f.origen_id = (t ->> 'o')::uuid);
  perform pg_temp.din_da('G3: la regla apagada', pg_temp.din_gasto(p, gid, (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid), '23514');
  if exists (select 1 from public.gastos g where g.id = gid) then raise exception 'G3: con la regla apagada dejó la fila'; end if;
end $$;
reset role;
rollback;

-- @test dinero: registrar es idempotente por id y no pisa otra unidad (G4)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; gid uuid := gen_random_uuid(); r jsonb; r2 jsonb;
begin
  p := pg_temp.din_persona('logistica.gastos.editar');
  r := pg_temp.din_gasto(p, gid, (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid);
  r2 := pg_temp.din_gasto(p, gid, (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 999, (t ->> 'tc')::uuid);
  if not (r2 ->> 'ya_existia')::boolean or (r2 ->> 'monto_base')::numeric <> 696.00 or (r2 ->> 'actualizado_en') <> (r ->> 'actualizado_en') then
    raise exception 'G4: el reintento debía devolver lo registrado; dio %', r2;
  end if;
  if (select count(*) from public.gastos g where g.id = gid) <> 1 then raise exception 'G4: el reintento duplicó'; end if;
  perform pg_temp.din_da('G4: el mismo id en otra unidad', pg_temp.din_gasto(p, gid, (t ->> 'v3')::uuid, (t ->> 'cat')::uuid, 'XTS', 1, (t ->> 'tc')::uuid), '23505', 'id');
  update public.gastos set eliminado_en = now() where gastos.id = gid;
  perform pg_temp.din_da('G4: un id ya borrado', pg_temp.din_gasto(p, gid, (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 1, (t ->> 'tc')::uuid), 'PT409');
end $$;
reset role;
rollback;

-- @test dinero: quien ve gastos sólo en otro origen no lee el gasto (G7)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; otro uuid; r jsonb;
begin
  p := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  otro := pg_temp.din_persona('logistica.gastos.ver:todos:' || (t ->> 'o2'));
  r := pg_temp.din_gasto(p, gen_random_uuid(), (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid);
  if (pg_temp.din_corre(p, format('select to_jsonb(count(*)) from public.gastos where id = %L', r ->> 'id')))::int <> 1 then
    raise exception 'G7: quien lo cargó debía leerlo';
  end if;
  if (pg_temp.din_corre(otro, format('select to_jsonb(count(*)) from public.gastos where id = %L', r ->> 'id')))::int <> 0 then
    raise exception 'G7: quien ve gastos en otro origen leyó el gasto';
  end if;
end $$;
reset role;
rollback;

-- Corregir y eliminar como esa persona, con la versión de la fila (o la que se pase).
create or replace function pg_temp.din_guardar(p_quien uuid, p_id uuid, p_cambios jsonb, p_version timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.gasto_guardar(%L, %L, %L)', p_id,
                                           coalesce(p_version, (select actualizado_en from public.gastos where id = p_id)), p_cambios));
$f$;

create or replace function pg_temp.din_eliminar(p_quien uuid, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.gasto_eliminar(%L, %L)', p_id, (select actualizado_en from public.gastos where id = p_id)));
$f$;

-- Una fase del flujo del origen que pide los tributos pagados, con el vehículo en ella.
create or replace function pg_temp.din_fase_con_tributos(t jsonb, p_vehiculo uuid) returns void language plpgsql as $f$
declare f uuid;
begin
  insert into public.fases (flujo_id, nombre, orden) values ((select id from public.flujos where origen_id = (t ->> 'o')::uuid), 'DIN aduana', 90) returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values (f, 'dato', 'aduana.tributos_pagados', false);
  update public.vehiculos set fase_id = f where id = p_vehiculo;
end $f$;

-- @test dinero: corregir un gasto no recibe el monto en base, usa la tasa guardada si sólo cambia el monto y respeta la versión (G5)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; gid uuid; r jsonb; r2 jsonb; v0 timestamptz; tc2 uuid;
begin
  p := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  gid := (pg_temp.din_gasto(p, gen_random_uuid(), (t ->> 'v')::uuid, (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid)) ->> 'id';
  perform pg_temp.din_da('G5: monto_base', pg_temp.din_guardar(p, gid, '{"monto_base": 1}'), '22023', 'monto_base');
  perform pg_temp.din_da('G5: tipo_cambio_aplicado', pg_temp.din_guardar(p, gid, '{"tipo_cambio_aplicado": 1}'), '22023', 'tipo_cambio_aplicado');
  perform pg_temp.din_da('G5: vehiculo_id', pg_temp.din_guardar(p, gid, jsonb_build_object('vehiculo_id', t ->> 'v3')), '22023', 'vehiculo_id');
  -- La tasa del tipo se mueve a 7: corregir sólo el monto sigue con 6,96.
  update public.tipos_cambio set valor = 7 where id = (t ->> 'tc')::uuid;
  r := pg_temp.din_guardar(p, gid, '{"monto": 200}');
  if (r ->> 'monto_base')::numeric is distinct from 1392.00 or (r ->> 'tipo_cambio_aplicado')::numeric <> 6.96 or (r ->> 'sin_cambios')::boolean then
    raise exception 'G5: con sólo otro monto debía usar la tasa guardada (1392,00); dio %', r;
  end if;
  -- Con otro tipo, la tasa vigente.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_b_' || substr(gen_random_uuid()::text, 1, 8), 'DIN B', 'XTS', t ->> 'base', 5)
  returning tipos_cambio.id into tc2;
  r := pg_temp.din_guardar(p, gid, jsonb_build_object('tipo_cambio_id', tc2));
  if (r ->> 'monto_base')::numeric is distinct from 1000.00 or (r ->> 'tipo_cambio_aplicado')::numeric <> 5 then
    raise exception 'G5: con otro tipo debía leer su tasa vigente (1000,00); dio %', r;
  end if;
  -- Pasar a la moneda base sin quitar el tipo es un error; quitándolo, monto_base = monto.
  perform pg_temp.din_da('G5: base con tipo', pg_temp.din_guardar(p, gid, jsonb_build_object('moneda', t ->> 'base')), '22023', 'tipo_cambio');
  r := pg_temp.din_guardar(p, gid, jsonb_build_object('moneda', t ->> 'base', 'tipo_cambio_id', null));
  if (r ->> 'monto_base')::numeric is distinct from 200.00 or r ->> 'tipo_cambio_aplicado' is not null then raise exception 'G5: en la base, monto_base = monto; dio %', r; end if;
  perform pg_temp.din_da('G5: tres decimales', pg_temp.din_guardar(p, gid, '{"monto": 1.005}'), '22023', 'monto');
  -- La versión: vieja, PT409; sin diferencia no se mueve.
  v0 := (select actualizado_en from public.gastos g where g.id = gid);
  perform pg_temp.din_da('G5: versión vieja', pg_temp.din_guardar(p, gid, '{"monto": 300}', v0 - interval '1 second'), 'PT409');
  r := pg_temp.din_guardar(p, gid, '{"monto": 200}', v0 - interval '1 second');
  if not (r ->> 'sin_cambios')::boolean or (select actualizado_en from public.gastos g where g.id = gid) <> v0 then
    raise exception 'G5: sin diferencia no debía escribir; dio %', r;
  end if;
  -- Dos correcciones en la misma transacción mueven la versión dos veces.
  r := pg_temp.din_guardar(p, gid, '{"notas": "una"}');
  r2 := pg_temp.din_guardar(p, gid, '{"notas": "dos"}', (r ->> 'actualizado_en')::timestamptz);
  if r2 ->> 'error' is not null or (r2 ->> 'actualizado_en')::timestamptz <= (r ->> 'actualizado_en')::timestamptz then
    raise exception 'G5: la segunda corrección de la transacción debía mover la versión otra vez; dio % tras %', r2, r;
  end if;
  if (select actualizado_en from public.gastos g where g.id = gid) is distinct from (r2 ->> 'actualizado_en')::timestamptz then
    raise exception 'G5: la versión devuelta no es la guardada: % contra %', r2, (select actualizado_en from public.gastos g where g.id = gid);
  end if;
end $$;
reset role;
rollback;

-- @test dinero: eliminar es suave y no quita el último tributo que la fase pide (G6)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; v uuid := (t ->> 'v')::uuid; g1 uuid; g2 uuid; r jsonb;
begin
  p := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  g1 := (pg_temp.din_gasto(p, gen_random_uuid(), v, (t ->> 'cat')::uuid, 'XTS', 10, (t ->> 'tc')::uuid)) ->> 'id';
  r := pg_temp.din_eliminar(p, g1);
  if r ->> 'error' is not null or (pg_temp.din_corre(p, format('select to_jsonb(count(*)) from public.gastos where id = %L', g1)))::int <> 0
     or (select eliminado_en from public.gastos where id = g1) is null then
    raise exception 'G6: eliminar debía dejar la fila borrada y fuera de la lectura; dio %', r;
  end if;
  perform pg_temp.din_da('G6: eliminar dos veces', pg_temp.din_eliminar(p, g1), 'PT409');
  -- El único tributo, con la fase que lo pide.
  perform pg_temp.din_fase_con_tributos(t, v);
  g1 := (pg_temp.din_gasto(p, gen_random_uuid(), v, (t ->> 'trib')::uuid, t ->> 'base', 50, null)) ->> 'id';
  perform pg_temp.din_da('G6: eliminar el último tributo', pg_temp.din_eliminar(p, g1), '23514', 'categoria_id');
  perform pg_temp.din_da('G6: cambiarle la categoría', pg_temp.din_guardar(p, g1, jsonb_build_object('categoria_id', t ->> 'cat')), '23514', 'categoria_id');
  g2 := (pg_temp.din_gasto(p, gen_random_uuid(), v, (t ->> 'trib')::uuid, t ->> 'base', 60, null)) ->> 'id';
  if (pg_temp.din_eliminar(p, g1)) ->> 'error' is not null then raise exception 'G6: con dos tributos, uno se elimina'; end if;
  perform pg_temp.din_da('G6: ahora g2 es el último', pg_temp.din_eliminar(p, g2), '23514', 'categoria_id');
  -- Sin la clave del origen, 42501.
  perform pg_temp.din_da('G6: sin la clave', pg_temp.din_eliminar(pg_temp.din_persona('logistica.gastos.ver'), g2), '42501');
end $$;
reset role;
rollback;
