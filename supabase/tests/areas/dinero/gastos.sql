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
