-- Prorratear un gasto entre vehículos (paso 6.10-1, C8). No depende de otro archivo (`SOLO=areas/dinero/prorratear.sql`). Los ayudantes son copia de
-- `gastos.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. 100,00 entre 3 da 33,34 + 33,33 + 33,33 en el orden del arreglo (suma exacta); con XTS a 6,96, cada monto_base = round(parte × 6,96, 2).
--   P2. El mismo lote dos veces: 3 filas y `ya_existia`; el mismo lote con otros vehículos, 23505.
--   P3. Con uno de los vehículos sin la clave, 42501 y ninguna fila; repetido, vacío, nulo o 201 vehículos, 22023; tres decimales, 22023.

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

create or replace function pg_temp.din_prorratear(p_quien uuid, p_lote uuid, p_vehiculos uuid[], p_cat uuid, p_moneda text, p_monto numeric, p_tc uuid)
returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.gastos_prorratear(%L, %L::uuid[], %L, %L, %s, %L, null, null, null, null)',
                                           p_lote, p_vehiculos, p_cat, p_moneda, p_monto, p_tc));
$f$;

-- @test dinero: prorratear reparte los centavos que sobran a los primeros y la suma es exacta (P1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; r jsonb; vs uuid[]; montos numeric[]; bases numeric[]; v4 uuid;
begin
  p := pg_temp.din_persona('logistica.gastos.editar');
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, 'DIN vehículo 4', 'kia') returning id into v4;
  vs := array[v4, (t ->> 'v')::uuid, (t ->> 'v3')::uuid];
  r := pg_temp.din_prorratear(p, gen_random_uuid(), vs, (t ->> 'cat')::uuid, t ->> 'base', 100, null);
  select array_agg(g.monto order by u.o), array_agg(g.vehiculo_id order by u.o) into montos, vs
    from jsonb_array_elements_text(r -> 'ids') with ordinality u (id, o) join public.gastos g on g.id = u.id::uuid;
  if montos is distinct from array[33.34, 33.33, 33.33]::numeric[] or vs[1] is distinct from v4 or (r ->> 'ya_existia')::boolean then
    raise exception 'P1: 100,00 entre 3 debía dar 33,34 + 33,33 + 33,33 en el orden del arreglo; dio % (%)', montos, r;
  end if;
  r := pg_temp.din_prorratear(p, gen_random_uuid(), array[v4, (t ->> 'v')::uuid, (t ->> 'v3')::uuid], (t ->> 'cat')::uuid, 'XTS', 100, (t ->> 'tc')::uuid);
  select array_agg(g.monto order by u.o), array_agg(g.monto_base order by u.o) into montos, bases
    from jsonb_array_elements_text(r -> 'ids') with ordinality u (id, o) join public.gastos g on g.id = u.id::uuid;
  if bases is distinct from array[232.05, 231.98, 231.98]::numeric[] or (select sum(x) from unnest(montos) x) <> 100 then
    raise exception 'P1: con XTS a 6,96 debía dar 232,05 · 231,98 · 231,98; dio % / %', montos, bases;
  end if;
  -- Siete centavos entre tres: 3 + 2 + 2.
  r := pg_temp.din_prorratear(p, gen_random_uuid(), array[v4, (t ->> 'v')::uuid, (t ->> 'v3')::uuid], (t ->> 'cat')::uuid, t ->> 'base', 0.07, null);
  select array_agg(g.monto order by u.o) into montos from jsonb_array_elements_text(r -> 'ids') with ordinality u (id, o) join public.gastos g on g.id = u.id::uuid;
  if montos is distinct from array[0.03, 0.02, 0.02]::numeric[] then raise exception 'P1: 0,07 entre 3 debía dar 0,03 + 0,02 + 0,02; dio %', montos; end if;
end $$;
reset role;
rollback;

-- @test dinero: prorratear es idempotente por lote y no reparte dos veces (P2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; lote uuid := gen_random_uuid(); r jsonb; r2 jsonb; vs uuid[];
begin
  p := pg_temp.din_persona('logistica.gastos.editar');
  vs := array[(t ->> 'v')::uuid, (t ->> 'v3')::uuid];
  r := pg_temp.din_prorratear(p, lote, vs, (t ->> 'cat')::uuid, t ->> 'base', 10, null);
  r2 := pg_temp.din_prorratear(p, lote, array[(t ->> 'v3')::uuid, (t ->> 'v')::uuid], (t ->> 'cat')::uuid, t ->> 'base', 999, null);
  if not (r2 ->> 'ya_existia')::boolean or (select count(*) from public.gastos g where g.lote_id = lote) <> 2
     or r2 -> 'ids' -> 0 is distinct from r -> 'ids' -> 1 then
    raise exception 'P2: el mismo lote debía devolver lo repartido en el orden pedido; dio % tras %', r2, r;
  end if;
  perform pg_temp.din_da('P2: el mismo lote con otros vehículos', pg_temp.din_prorratear(p, lote, array[(t ->> 'v')::uuid], (t ->> 'cat')::uuid, t ->> 'base', 10, null), '23505', 'lote');
end $$;
reset role;
rollback;

-- @test dinero: prorratear es todo o nada y valida los vehículos (P3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; lote uuid := gen_random_uuid(); v uuid := (t ->> 'v')::uuid; cat uuid := (t ->> 'cat')::uuid;
begin
  p := pg_temp.din_persona('logistica.gastos.editar:todos:' || (t ->> 'o'));
  perform pg_temp.din_da('P3: uno sin la clave', pg_temp.din_prorratear(p, lote, array[v, (t ->> 'v2')::uuid, (t ->> 'v3')::uuid], cat, t ->> 'base', 100, null), '42501');
  if exists (select 1 from public.gastos g where g.lote_id = lote) then raise exception 'P3: un rechazo dejó filas'; end if;
  perform pg_temp.din_da('P3: repetido', pg_temp.din_prorratear(p, lote, array[v, v], cat, t ->> 'base', 100, null), '22023', 'vehiculos');
  perform pg_temp.din_da('P3: vacío', pg_temp.din_prorratear(p, lote, '{}'::uuid[], cat, t ->> 'base', 100, null), '22023', 'vehiculos');
  perform pg_temp.din_da('P3: nulo', pg_temp.din_prorratear(p, lote, array[v, null], cat, t ->> 'base', 100, null), '22023', 'vehiculos');
  perform pg_temp.din_da('P3: 201', pg_temp.din_prorratear(p, lote, array(select gen_random_uuid() from generate_series(1, 201)), cat, t ->> 'base', 100, null), '22023', 'vehiculos');
  perform pg_temp.din_da('P3: tres decimales', pg_temp.din_prorratear(p, lote, array[v], cat, t ->> 'base', 100.005, null), '22023', 'monto');
end $$;
reset role;
rollback;
