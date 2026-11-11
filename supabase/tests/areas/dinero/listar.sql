-- Las listas de gastos y pagos por cursor (paso 6.10-2, C5–C9). No depende de otro archivo (`SOLO=areas/dinero/listar.sql`). Los ayudantes son copia
-- de `gastos.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   L1. Alcance: con `gastos.ver` en todos de o1 y en propios de o2, `gastos_listar` (todas sus páginas) da el mismo conjunto que la RLS de `gastos`
--       (o1 entero, de o2 sólo el vehículo que creó, nada de o3); sin la clave, vacía.
--   L2. Cursor: cinco gastos (tres en la misma fecha), de a 2: tres filas (una de más), en `(fecha desc, id desc)`, sin repetir ni saltar; medio cursor, 22023.
--   L3. Filtros: `categoria`, `origen`, `desde` y `hasta` recortan; una clave de más, un valor mal escrito o `desde > hasta`, 22023 con su hint.
--   L4. `pagos_listar`: un asesor con `pagos.ver` en propios recibe lo mismo que bajo RLS; `sin_confirmar` deja fuera los confirmados.

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

-- La lista como esa persona: un arreglo de filas, o {error, …}.
create or replace function pg_temp.din_lista(p_quien uuid, p_fn text, p_fecha date, p_id uuid, p_tope int, p_filtros jsonb) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]'') from public.%I(%L, %L, %s, %L) x',
                                           p_fn, p_fecha, p_id, coalesce(p_tope::text, 'null'), p_filtros));
$f$;

-- Todas las páginas, de a p_tope: los ids en el orden de la lista. Falla si una página repite o salta.
create or replace function pg_temp.din_todas(p_quien uuid, p_fn text, p_tope int, p_filtros jsonb) returns uuid[] language plpgsql as $f$
declare r jsonb; n int; f date; i uuid; ids uuid[] := '{}'; k int;
begin
  loop
    r := pg_temp.din_lista(p_quien, p_fn, f, i, p_tope, p_filtros);
    if jsonb_typeof(r) <> 'array' then raise exception 'la lista falló: %', r; end if;
    n := jsonb_array_length(r);
    for k in 0 .. least(n, p_tope) - 1 loop
      ids := ids || (r -> k ->> 'id')::uuid;
    end loop;
    exit when n <= p_tope;
    f := (r -> (p_tope - 1) ->> 'fecha')::date;
    i := (r -> (p_tope - 1) ->> 'id')::uuid;
  end loop;
  return ids;
end $f$;

create or replace function pg_temp.din_gasto_el(p_quien uuid, t jsonb, p_vehiculo uuid, p_fecha date, p_cat uuid default null) returns uuid language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.din_corre(p_quien, format('select public.gasto_registrar(%L, %L, null, %L, %L, 10, null, %L, null, null, null)',
                                         gen_random_uuid(), p_vehiculo, coalesce(p_cat, (t ->> 'cat')::uuid), t ->> 'base', p_fecha));
  if r ? 'error' then raise exception 'no se pudo registrar el gasto: %', r; end if;
  return (r ->> 'id')::uuid;
end $f$;

create or replace function pg_temp.din_ordenados(p uuid[]) returns uuid[] language sql as $f$
  select coalesce(array_agg(x order by x), '{}') from unnest(p) x;
$f$;

-- @test dinero: gastos_listar da lo mismo que la RLS de gastos, con el alcance por origen (L1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; p uuid; o3 uuid; v4 uuid; vp uuid; lista uuid[]; rls uuid[]; esperado uuid[] := '{}';
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  p := pg_temp.din_persona('logistica.gastos.ver:todos:' || (t ->> 'o'), 'logistica.gastos.ver:propios:' || (t ->> 'o2'));
  insert into public.origenes (clave, nombre) values ('din3_' || substr(gen_random_uuid()::text, 1, 8), 'DIN origen 3') returning id into o3;
  insert into public.vehiculos (origen_id, titulo, marca) values (o3, 'DIN vehículo 4', 'kia') returning id into v4;
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o2')::uuid, 'DIN vehículo propio', 'kia') returning id into vp;
  update public.vehiculos set creado_por = p where id = vp;
  esperado := esperado || pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-01-10') || pg_temp.din_gasto_el(ed, t, (t ->> 'v3')::uuid, '2026-01-11')
                       || pg_temp.din_gasto_el(ed, t, vp, '2026-01-12');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v2')::uuid, '2026-01-13');
  perform pg_temp.din_gasto_el(ed, t, v4, '2026-01-14');
  lista := pg_temp.din_todas(p, 'gastos_listar', 2, null);
  rls := array(select (e ->> 'id')::uuid from jsonb_array_elements(pg_temp.din_corre(p,
           'select coalesce(jsonb_agg(jsonb_build_object(''id'', id)), ''[]'') from public.gastos where vehiculo_id is not null')) e);
  if pg_temp.din_ordenados(lista) is distinct from pg_temp.din_ordenados(rls) then
    raise exception 'L1: la lista (%) no es lo que deja ver la RLS (%)', lista, rls;
  end if;
  if not (lista @> esperado) or lista && array(select id from public.gastos where vehiculo_id in ((t ->> 'v2')::uuid, v4)) then
    raise exception 'L1: debía traer o1 entero y el propio de o2, y nada del ajeno de o2 ni de o3; trajo %', lista;
  end if;
  if pg_temp.din_lista(pg_temp.din_persona(variadic '{}'::text[]), 'gastos_listar', null, null, null, null) is distinct from '[]'::jsonb then
    raise exception 'L1: sin la clave la lista debía salir vacía';
  end if;
end $$;
rollback;

-- @test dinero: gastos_listar recorre por cursor en (fecha desc, id desc) sin repetir ni saltar (L2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; r jsonb; lista uuid[]; orden uuid[]; filtro jsonb;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  filtro := jsonb_build_object('origen', t ->> 'o');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-02-01');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-02-03');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-02-02');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v3')::uuid, '2026-02-02');
  perform pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-02-02');
  r := pg_temp.din_lista(ed, 'gastos_listar', null, null, 2, filtro);
  if jsonb_array_length(r) <> 3 then raise exception 'L2: de a 2 debía traer 3 filas (una de más) y trajo %', jsonb_array_length(r); end if;
  orden := array(select g.id from public.gastos g join public.vehiculos v on v.id = g.vehiculo_id
                  where v.origen_id = (t ->> 'o')::uuid and g.eliminado_en is null order by g.fecha desc, g.id desc);
  lista := pg_temp.din_todas(ed, 'gastos_listar', 2, filtro);
  if lista is distinct from orden then raise exception 'L2: las páginas dieron % y el orden era %', lista, orden; end if;
  if cardinality(orden) <> 5 then raise exception 'L2: debía haber 5 gastos y hay %', cardinality(orden); end if;
  perform pg_temp.din_da('L2: medio cursor', pg_temp.din_lista(ed, 'gastos_listar', '2026-02-02', null, 2, null), '22023', 'cursor');
end $$;
rollback;

-- @test dinero: los filtros de gastos_listar recortan y uno que no vale da 22023 con su hint (L3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; g1 uuid; g2 uuid; g3 uuid; r jsonb; o text := t ->> 'o';
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  g1 := pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-03-01');
  g2 := pg_temp.din_gasto_el(ed, t, (t ->> 'v')::uuid, '2026-03-05', (t ->> 'trib')::uuid);
  g3 := pg_temp.din_gasto_el(ed, t, (t ->> 'v2')::uuid, '2026-03-09');
  r := pg_temp.din_lista(ed, 'gastos_listar', null, null, 100, jsonb_build_object('categoria', t ->> 'trib'));
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> g2::text then
    raise exception 'L3: por categoría debía traer sólo el de tributos: %', r;
  end if;
  r := pg_temp.din_lista(ed, 'gastos_listar', null, null, 100, jsonb_build_object('origen', t ->> 'o2'));
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> g3::text then raise exception 'L3: por origen debía traer sólo el de o2: %', r; end if;
  r := pg_temp.din_lista(ed, 'gastos_listar', null, null, 100, jsonb_build_object('origen', o, 'desde', '2026-03-02', 'hasta', '2026-03-05'));
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> g2::text then raise exception 'L3: entre fechas debía traer sólo el del 5: %', r; end if;
  r := pg_temp.din_lista(ed, 'gastos_listar', null, null, 100, jsonb_build_object('origen', o, 'hasta', '2026-03-01'));
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> g1::text then raise exception 'L3: hasta el 1 debía traer sólo el del 1: %', r; end if;
  perform pg_temp.din_da('L3: clave de más', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '{"x": 1}'), '22023', 'x');
  perform pg_temp.din_da('L3: sin_confirmar no es de gastos', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '{"sin_confirmar": true}'), '22023', 'sin_confirmar');
  perform pg_temp.din_da('L3: origen mal escrito', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '{"origen": "no"}'), '22023', 'origen');
  perform pg_temp.din_da('L3: fecha imposible', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '{"desde": "2026-13-01"}'), '22023', 'desde');
  perform pg_temp.din_da('L3: desde > hasta', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '{"desde": "2026-03-05", "hasta": "2026-03-01"}'), '22023', 'hasta');
  perform pg_temp.din_da('L3: no es un objeto', pg_temp.din_lista(ed, 'gastos_listar', null, null, 10, '[1]'), '22023', 'filtros');
end $$;
rollback;

create or replace function pg_temp.din_pago_el(p_quien uuid, t jsonb, p_vehiculo uuid, p_fecha date) returns uuid language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.din_corre(p_quien, format('select public.pago_registrar(%L, %L, null, ''Anticipo'', %L, 10, null, null, %L, null, null)',
                                         gen_random_uuid(), p_vehiculo, t ->> 'base', p_fecha));
  if r ? 'error' then raise exception 'no se pudo registrar el pago: %', r; end if;
  return (r ->> 'id')::uuid;
end $f$;

-- @test dinero: pagos_listar da lo mismo que la RLS de pagos para quien ve sólo lo propio, y sin_confirmar deja fuera los confirmados (L4)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; ase uuid; jefa uuid; vp uuid; p1 uuid; p2 uuid; ajeno uuid; pr uuid; lista uuid[]; rls uuid[]; x jsonb;
begin
  ed := pg_temp.din_persona('logistica.pagos.editar', 'logistica.pagos.ver', 'logistica.pagos.confirmar');
  ase := pg_temp.din_persona('logistica.pagos.ver:propios');
  jefa := pg_temp.din_persona('logistica.pagos.ver', 'repuestos.costos.ver');
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, 'DIN vehículo del asesor', 'kia') returning id into vp;
  update public.vehiculos set creado_por = ase where id = vp;
  p1 := pg_temp.din_pago_el(ed, t, vp, '2026-04-01');
  p2 := pg_temp.din_pago_el(ed, t, vp, '2026-04-02');
  ajeno := pg_temp.din_pago_el(ed, t, (t ->> 'v')::uuid, '2026-04-03');
  x := pg_temp.din_corre(ed, format('select public.pago_confirmar(%L, %L)', p2, (select actualizado_en from public.pagos where id = p2)));
  if x ? 'error' then raise exception 'L4: no se pudo confirmar: %', x; end if;
  insert into public.repuestos_proyectos (vehiculo_id) values (null) returning id into pr;
  insert into public.pagos (proyecto_repuestos_id, concepto, moneda, monto, monto_base) values (pr, 'DIN proyecto', t ->> 'base', 10, 10);

  lista := pg_temp.din_todas(ase, 'pagos_listar', 1, null);
  rls := array(select (e ->> 'id')::uuid from jsonb_array_elements(pg_temp.din_corre(ase,
           'select coalesce(jsonb_agg(jsonb_build_object(''id'', id)), ''[]'') from public.pagos where vehiculo_id is not null')) e);
  if pg_temp.din_ordenados(lista) is distinct from pg_temp.din_ordenados(rls) or not (lista @> array[p1, p2]) or ajeno = any (lista) then
    raise exception 'L4: el asesor debía recibir sus dos pagos, lo mismo que la RLS (%), y recibió %', rls, lista;
  end if;
  lista := pg_temp.din_todas(ase, 'pagos_listar', 10, '{"sin_confirmar": true}');
  if lista is distinct from array[p1] then raise exception 'L4: sin_confirmar debía dejar sólo el sin confirmar y dejó %', lista; end if;
  -- Quien ve también los pagos de proyectos (RLS) no los recibe en la lista: es de vehículos.
  lista := pg_temp.din_todas(jefa, 'pagos_listar', 100, jsonb_build_object('origen', t ->> 'o'));
  if pg_temp.din_ordenados(lista) is distinct from pg_temp.din_ordenados(array[p1, p2, ajeno]) then
    raise exception 'L4: la jefa debía recibir los tres pagos del origen, sin el del proyecto, y recibió %', lista;
  end if;
  if (pg_temp.din_lista(jefa, 'pagos_listar', null, null, 1, null) -> 0) ?| array['lead_id', 'notas'] then
    raise exception 'L4: la lista no devuelve el lead ni las notas';
  end if;
end $$;
rollback;
