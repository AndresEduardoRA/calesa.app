-- El margen de un vehículo (paso 6.10-2, C10–C11). No depende de otro archivo (`SOLO=areas/dinero/margen.sql`). Los ayudantes son copia de `gastos.sql`.
-- Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   R1. Un gasto de flete de 100 XTS (696,00), uno de tributos de 50 en la base y uno borrado de 10: `real` 746,00 y `por_categoria` con dos entradas en el
--       orden del catálogo, que suman `real`.
--   R2. Sin pagos confirmados `margen` es nulo, no 0, aunque haya uno sin confirmar; sin cotización final, `desviacion` y `cotizado` nulos.
--   R3. Con una final de 2000 y un pago confirmado de 1000: `desviacion` 1254,00, `venta` 1000,00 y `margen` 254,00.
--   R4. Sin `logistica.margen.ver` del origen (la tiene en otro), 42501; un vehículo inexistente o en la papelera, 42501 con el mismo texto.


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

create or replace function pg_temp.din_margen(p_quien uuid, p_vehiculo uuid) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.margen_vehiculo(%L)', p_vehiculo));
$f$;

-- Lo que R1 deja: flete 100 XTS (696,00), tributos 50 en la base y un flete de 10 borrado.
create or replace function pg_temp.din_gastos_r1(t jsonb) returns void language plpgsql as $f$
declare ed uuid := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver'); r jsonb; g uuid; v text := t ->> 'v';
begin
  r := pg_temp.din_corre(ed, format('select public.gasto_registrar(%L, %L, null, %L, ''XTS'', 100, %L, null, null, null, null)', gen_random_uuid(), v, t ->> 'cat', t ->> 'tc'));
  if r ? 'error' then raise exception 'flete: %', r; end if;
  r := pg_temp.din_corre(ed, format('select public.gasto_registrar(%L, %L, null, %L, %L, 50, null, null, null, null, null)', gen_random_uuid(), v, t ->> 'trib', t ->> 'base'));
  if r ? 'error' then raise exception 'tributos: %', r; end if;
  r := pg_temp.din_corre(ed, format('select public.gasto_registrar(%L, %L, null, %L, %L, 10, null, null, null, null, null)', gen_random_uuid(), v, t ->> 'cat', t ->> 'base'));
  g := (r ->> 'id')::uuid;
  r := pg_temp.din_corre(ed, format('select public.gasto_eliminar(%L, %L)', g, (select actualizado_en from public.gastos where id = g)));
  if r ? 'error' then raise exception 'eliminar: %', r; end if;
end $f$;

-- Un pago de 1000 en la base del vehículo; confirmado si se pide.
create or replace function pg_temp.din_pago_mil(t jsonb, p_confirmar boolean) returns void language plpgsql as $f$
declare ed uuid := pg_temp.din_persona('logistica.pagos.editar', 'logistica.pagos.ver', 'logistica.pagos.confirmar'); r jsonb; p uuid;
begin
  r := pg_temp.din_corre(ed, format('select public.pago_registrar(%L, %L, null, ''Anticipo'', %L, 1000, null, null, null, null, null)', gen_random_uuid(), t ->> 'v', t ->> 'base'));
  if r ? 'error' then raise exception 'pago: %', r; end if;
  p := (r ->> 'id')::uuid;
  if p_confirmar then
    r := pg_temp.din_corre(ed, format('select public.pago_confirmar(%L, %L)', p, (select actualizado_en from public.pagos where id = p)));
    if r ? 'error' then raise exception 'confirmar: %', r; end if;
  end if;
end $f$;

-- Una cotización final activa del vehículo con ese total en la base (con una fórmula mínima del origen).
create or replace function pg_temp.din_final(t jsonb, p_total numeric) returns void language plpgsql as $f$
declare f uuid;
begin
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values ((t ->> 'o')::uuid, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'total', 'tipo', 'input', 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))), '{}', '{}',
          jsonb_build_object('total', jsonb_build_object('ver', 'todos', 'editar', 'todos')))
  returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((t ->> 'o')::uuid, pg_temp.din_persona(variadic '{}'::text[]), f, (t ->> 'v')::uuid, 'final', jsonb_build_object('total', p_total),
          '{"total": "input"}', '{}', jsonb_build_object('usd', p_total), p_total);
end $f$;

-- @test dinero: el margen suma el real en moneda base sin los borrados, y por categoría en el orden del catálogo (R1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); m jsonb; pc jsonb;
begin
  perform pg_temp.din_gastos_r1(t);
  m := pg_temp.din_margen(pg_temp.din_persona('logistica.margen.ver'), (t ->> 'v')::uuid);
  pc := m -> 'por_categoria';
  if (m ->> 'real')::numeric is distinct from 746.00 or jsonb_array_length(pc) <> 2 then
    raise exception 'R1: real debía ser 746,00 con dos categorías y dio %', m;
  end if;
  if pc -> 0 ->> 'categoria_id' <> t ->> 'cat' or (pc -> 0 ->> 'real')::numeric <> 696.00 or pc -> 0 ->> 'proposito' <> 'flete'
     or pc -> 1 ->> 'categoria_id' <> t ->> 'trib' or (pc -> 1 ->> 'real')::numeric <> 50.00 then
    raise exception 'R1: por_categoria debía ser flete 696,00 y tributos 50,00, en ese orden, y dio %', pc;
  end if;
  if (select sum((e ->> 'real')::numeric) from jsonb_array_elements(pc) e) <> (m ->> 'real')::numeric then
    raise exception 'R1: la suma de por_categoria no es el real: %', m;
  end if;
  m := pg_temp.din_margen(pg_temp.din_persona('logistica.margen.ver'), (t ->> 'v3')::uuid);
  if m -> 'por_categoria' <> '[]'::jsonb or (m ->> 'real')::numeric <> 0 then raise exception 'R1: sin gastos debía dar [] y real 0: %', m; end if;
end $$;
rollback;

-- @test dinero: sin pagos confirmados el margen es nulo y sin cotización final la desviación es nula (R2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); m jsonb;
begin
  perform pg_temp.din_gastos_r1(t);
  perform pg_temp.din_pago_mil(t, false);
  m := pg_temp.din_margen(pg_temp.din_persona('logistica.margen.ver'), (t ->> 'v')::uuid);
  if not (m ? 'margen') or m -> 'margen' <> 'null'::jsonb or m -> 'venta' <> 'null'::jsonb then
    raise exception 'R2: sin pagos confirmados margen y venta debían ser nulos (no 0) y dio %', m;
  end if;
  if m -> 'desviacion' <> 'null'::jsonb or m -> 'cotizado' <> 'null'::jsonb then
    raise exception 'R2: sin cotización final desviacion y cotizado debían ser nulos y dio %', m;
  end if;
end $$;
rollback;

-- @test dinero: con la final y un pago confirmado salen la desviación, la venta y el margen (R3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); m jsonb;
begin
  perform pg_temp.din_gastos_r1(t);
  perform pg_temp.din_final(t, 2000);
  perform pg_temp.din_pago_mil(t, true);
  perform pg_temp.din_pago_mil(t, false);
  m := pg_temp.din_margen(pg_temp.din_persona('logistica.margen.ver'), (t ->> 'v')::uuid);
  if (m ->> 'cotizado')::numeric is distinct from 2000 or (m ->> 'desviacion')::numeric is distinct from 1254.00
     or (m ->> 'venta')::numeric is distinct from 1000.00 or (m ->> 'margen')::numeric is distinct from 254.00 then
    raise exception 'R3: debía dar cotizado 2000, desviacion 1254,00, venta 1000,00 y margen 254,00, y dio %', m;
  end if;
end $$;
rollback;

-- @test dinero: sin logistica.margen.ver del origen, o con un vehículo que no existe o está en la papelera, 42501 (R4)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); otro uuid; ve uuid; r jsonb; v_texto text;
begin
  otro := pg_temp.din_persona('logistica.margen.ver:todos:' || (t ->> 'o2'));
  ve := pg_temp.din_persona('logistica.margen.ver:todos:' || (t ->> 'o'));
  r := pg_temp.din_margen(otro, (t ->> 'v')::uuid);
  perform pg_temp.din_da('R4: con la clave en otro origen', r, '42501');
  v_texto := r ->> 'mensaje';
  if pg_temp.din_margen(ve, (t ->> 'v')::uuid) ? 'error' then raise exception 'R4: con la clave del origen debía ver el margen'; end if;
  r := pg_temp.din_margen(otro, gen_random_uuid());
  perform pg_temp.din_da('R4: un vehículo que no existe', r, '42501');
  if r ->> 'mensaje' <> v_texto then raise exception 'R4: el mensaje de uno inexistente (%) no es el de sin la clave (%)', r ->> 'mensaje', v_texto; end if;
  update public.vehiculos set eliminado_en = now() where id = (t ->> 'v')::uuid;
  perform pg_temp.din_da('R4: un vehículo en la papelera', pg_temp.din_margen(ve, (t ->> 'v')::uuid), '42501');
end $$;
rollback;
