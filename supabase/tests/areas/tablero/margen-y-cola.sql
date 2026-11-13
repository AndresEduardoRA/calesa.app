-- El margen del mes y la cola web del tablero en la base (paso 9.11-1), 1 de 2. No depende de otro archivo (`SOLO=areas/tablero/margen-y-cola.sql`). Los
-- ayudantes del dinero son copia de `areas/dinero/margen.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   R1. Dinero al centavo en el mes en curso: dos vehículos en dos orígenes, XTS a 6,96 y la base; la suma en moneda base cuadra con la de
--       `margen_vehiculo`; un pago sin confirmar no suma, un gasto borrado tampoco; el vehículo con un pago sin confirmar del período y ninguno
--       confirmado se cuenta aparte (`sin_venta`) y el que sólo tiene un gasto no aparece.
--   R2. Un vehículo cae en el período de su último pago confirmado, con todos sus pagos (D3); el que tiene uno solo, viejo, cae en su mes.
--   R3. Sin vehículos, venta, real, cotizado y margen son nulos, nunca 0.
--   R4. Con `logistica.margen.ver` en un solo origen, sólo ése; sin la clave, 42501; sin `web.cola.gestionar`, 42501 en la cola.
--   R5. `anon` no ejecuta, `authenticated` sí; `definer` con `search_path` vacío; una ventana de 367 días, 22023 con hint `p_hasta`.
--   Las cifras de la cola (R6 y R7) están en `cola-web.sql`.

-- Una persona activa con estas claves (`clave[:alcance[:origen]]`) y su nombre.
create or replace function pg_temp.tmc_persona(p_claves text[], p_nombre text default 'TMC persona') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'tmc-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = v_id;
  insert into public.roles (clave, nombre) values ('tmc_' || substr(v_id::text, 1, 8), 'TMC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.tmc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', sqlstate, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.tmc_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tmc_zona() returns text language sql as $f$
  select coalesce((select zona_horaria from public.ajustes_empresa where id = 1), 'America/La_Paz');
$f$;

-- Hoy en la zona de la empresa (no en la de la sesión): la ventana del mes y la fecha de un pago salen de acá.
create or replace function pg_temp.tmc_hoy() returns date language sql as $f$
  select (now() at time zone pg_temp.tmc_zona())::date;
$f$;

create or replace function pg_temp.tmc_margen(p_quien uuid, p_desde date, p_hasta date) returns jsonb language sql as $f$
  select pg_temp.tmc_corre(p_quien, format('select public.tablero_margen(%L, %L)', p_desde, p_hasta));
$f$;

-- El margen del mes en curso (en la zona de la empresa).
create or replace function pg_temp.tmc_margen_mes(p_quien uuid) returns jsonb language sql as $f$
  select pg_temp.tmc_margen(p_quien, date_trunc('month', pg_temp.tmc_hoy())::date,
                            (date_trunc('month', pg_temp.tmc_hoy()) + interval '1 month - 1 day')::date);
$f$;

create or replace function pg_temp.tmc_claves(p jsonb) returns text language sql as $f$
  select string_agg(k, ',' order by k) from jsonb_object_keys(p) k;
$f$;

-- Un monto de una respuesta, como número (nulo si la hoja es null).
create or replace function pg_temp.tmc_n(p jsonb, p_clave text) returns numeric language sql as $f$
  select (p ->> p_clave)::numeric;
$f$;

-- Un pago del vehículo (con tipo de cambio si no es en la base), confirmado si se pide; devuelve su id.
create or replace function pg_temp.tmc_pago(p_vehiculo uuid, p_moneda text, p_monto numeric, p_tc uuid, p_confirmar boolean,
                                            p_fecha date default null) returns uuid language plpgsql as $f$
declare ed uuid := pg_temp.tmc_persona(array['logistica.pagos.editar', 'logistica.pagos.ver', 'logistica.pagos.confirmar']); r jsonb; p uuid;
begin
  r := pg_temp.tmc_corre(ed, format('select public.pago_registrar(%L, %L, null, ''Anticipo'', %L, %s, %L, null, %L, null, null)',
                                    gen_random_uuid(), p_vehiculo, p_moneda, p_monto, p_tc, p_fecha));
  if r ? 'error' then raise exception 'pago: %', r; end if;
  p := (r ->> 'id')::uuid;
  if p_confirmar then
    r := pg_temp.tmc_corre(ed, format('select public.pago_confirmar(%L, %L)', p, (select actualizado_en from public.pagos where id = p)));
    if r ? 'error' then raise exception 'confirmar: %', r; end if;
  end if;
  return p;
end $f$;

-- Un gasto del vehículo; borrado si se pide.
create or replace function pg_temp.tmc_gasto(p_vehiculo uuid, p_categoria uuid, p_moneda text, p_monto numeric, p_tc uuid,
                                             p_borrar boolean default false) returns void language plpgsql as $f$
declare ed uuid := pg_temp.tmc_persona(array['logistica.gastos.editar', 'logistica.gastos.ver']); r jsonb; g uuid;
begin
  r := pg_temp.tmc_corre(ed, format('select public.gasto_registrar(%L, %L, null, %L, %L, %s, %L, null, null, null, null)',
                                    gen_random_uuid(), p_vehiculo, p_categoria, p_moneda, p_monto, p_tc));
  if r ? 'error' then raise exception 'gasto: %', r; end if;
  if p_borrar then
    g := (r ->> 'id')::uuid;
    r := pg_temp.tmc_corre(ed, format('select public.gasto_eliminar(%L, %L)', g, (select actualizado_en from public.gastos where id = g)));
    if r ? 'error' then raise exception 'eliminar: %', r; end if;
  end if;
end $f$;

-- Una cotización final activa del vehículo con ese total en la base (con una fórmula mínima del origen).
create or replace function pg_temp.tmc_final(p_origen uuid, p_vehiculo uuid, p_total numeric) returns void language plpgsql as $f$
declare f uuid;
begin
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (p_origen, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'total', 'tipo', 'input', 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))), '{}', '{}',
          jsonb_build_object('total', jsonb_build_object('ver', 'todos', 'editar', 'todos')))
  returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values (p_origen, pg_temp.tmc_persona('{}'), f, p_vehiculo, 'final', jsonb_build_object('total', p_total),
          '{"total": "input"}', '{}', jsonb_build_object('usd', p_total), p_total);
end $f$;

create or replace function pg_temp.tmc_origen(p_nombre text) returns uuid language sql as $f$
  insert into public.origenes (clave, nombre) values ('tmc_' || substr(gen_random_uuid()::text, 1, 8), p_nombre) returning id;
$f$;

create or replace function pg_temp.tmc_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, marca) values (p_origen, 'TMC vehículo', 'toyota') returning id;
$f$;

-- El terreno de R1: origen `o` con A (pagos y gastos, final de 1500), C (sólo un pago sin confirmar de hoy) y D (sólo un gasto); origen `o2` con B.
create or replace function pg_temp.tmc_terreno() returns jsonb language plpgsql as $f$
declare o uuid := pg_temp.tmc_origen('TMC origen 1'); o2 uuid := pg_temp.tmc_origen('TMC origen 2');
  a uuid := pg_temp.tmc_vehiculo(o); b uuid := pg_temp.tmc_vehiculo(o2); c uuid := pg_temp.tmc_vehiculo(o); d uuid := pg_temp.tmc_vehiculo(o);
  cat uuid; tc uuid; v_base text := (select moneda_base::text from public.ajustes_empresa where id = 1);
begin
  insert into public.categorias_gasto (nombre, proposito) values ('TMC flete ' || substr(o::text, 1, 8), 'flete') returning id into cat;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict do nothing;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor)
  values ('tmc_' || substr(o::text, 1, 8), 'TMC', 'XTS', v_base, 6.96) returning id into tc;
  -- A: 150 XTS confirmado (1044,00) y 99 sin confirmar; gastos 100 XTS (696,00) y 50,10; final 1500,00.
  perform pg_temp.tmc_pago(a, 'XTS', 150, tc, true);
  perform pg_temp.tmc_pago(a, v_base, 99, null, false, pg_temp.tmc_hoy());
  perform pg_temp.tmc_gasto(a, cat, 'XTS', 100, tc);
  perform pg_temp.tmc_gasto(a, cat, v_base, 50.10, null);
  perform pg_temp.tmc_final(o, a, 1500.00);
  -- B: 2000,55 confirmado; gastos 0,35 XTS (2,44), 1200,00 y uno de 10 borrado.
  perform pg_temp.tmc_pago(b, v_base, 2000.55, null, true);
  perform pg_temp.tmc_gasto(b, cat, 'XTS', 0.35, tc);
  perform pg_temp.tmc_gasto(b, cat, v_base, 1200.00, null);
  perform pg_temp.tmc_gasto(b, cat, v_base, 10, null, true);
  -- C: 500 sin confirmar, de hoy en la zona de la empresa. D: sólo un gasto.
  perform pg_temp.tmc_pago(c, v_base, 500, null, false, pg_temp.tmc_hoy());
  perform pg_temp.tmc_gasto(d, cat, v_base, 70, null);
  return jsonb_build_object('o', o, 'o2', o2, 'a', a, 'b', b, 'c', c, 'd', d);
end $f$;

-- @test tablero: R1 · dinero: el margen del mes cuadra al centavo en moneda base y el vehículo sin venta se cuenta aparte
begin;
do $$
declare t jsonb := pg_temp.tmc_terreno();
  q uuid := pg_temp.tmc_persona(array['logistica.margen.ver:todos:' || (t ->> 'o'), 'logistica.margen.ver:todos:' || (t ->> 'o2')]);
  m jsonb := pg_temp.tmc_margen_mes(q); po jsonb := m -> 'por_origen'; ma jsonb; mb jsonb;
begin
  if pg_temp.tmc_claves(m) is distinct from 'cotizado,desde,hasta,margen,moneda,por_origen,por_origen_hay_mas,real,sin_venta,vehiculos,venta,zona' then
    raise exception 'R1: claves %', pg_temp.tmc_claves(m);
  end if;
  if (m ->> 'vehiculos')::int is distinct from 2 or pg_temp.tmc_n(m, 'venta') is distinct from 3044.55 or pg_temp.tmc_n(m, 'real') is distinct from 1948.54
     or pg_temp.tmc_n(m, 'cotizado') is distinct from 1500.00 or pg_temp.tmc_n(m, 'margen') is distinct from 1096.01
     or (m ->> 'sin_venta')::int is distinct from 1 or m ->> 'moneda' is distinct from (select moneda_base::text from public.ajustes_empresa where id = 1) then
    raise exception 'R1: debía dar 2 vehículos, venta 3044,55, real 1948,54, cotizado 1500,00, margen 1096,01 y 1 sin venta: %', m;
  end if;
  if jsonb_array_length(po) <> 2 or (m -> 'por_origen_hay_mas') <> 'false'::jsonb then raise exception 'R1: por_origen %', m; end if;
  if po -> 0 ->> 'origen_id' is distinct from t ->> 'o2' or (po -> 0 ->> 'vehiculos')::int <> 1 or pg_temp.tmc_n(po -> 0, 'venta') <> 2000.55
     or pg_temp.tmc_n(po -> 0, 'real') <> 1202.44 or (po -> 0 -> 'cotizado') <> 'null'::jsonb or pg_temp.tmc_n(po -> 0, 'margen') <> 798.11
     or (po -> 0 ->> 'sin_venta')::int <> 0 then
    raise exception 'R1: o2 debía ir primero con 2000,55, 1202,44, sin cotizado y 798,11: %', po -> 0;
  end if;
  if po -> 1 ->> 'origen_id' is distinct from t ->> 'o' or (po -> 1 ->> 'vehiculos')::int <> 1 or pg_temp.tmc_n(po -> 1, 'venta') <> 1044.00
     or pg_temp.tmc_n(po -> 1, 'real') <> 746.10 or pg_temp.tmc_n(po -> 1, 'cotizado') <> 1500.00 or pg_temp.tmc_n(po -> 1, 'margen') <> 297.90
     or (po -> 1 ->> 'sin_venta')::int <> 1 or po -> 1 ->> 'nombre' <> 'TMC origen 1' then
    raise exception 'R1: o debía ir segundo con 1044,00, 746,10, 1500,00, 297,90 y 1 sin venta: %', po -> 1;
  end if;
  -- El mismo número que el panel de cada unidad.
  ma := pg_temp.tmc_corre(q, format('select public.margen_vehiculo(%L)', t ->> 'a'));
  mb := pg_temp.tmc_corre(q, format('select public.margen_vehiculo(%L)', t ->> 'b'));
  if pg_temp.tmc_n(ma, 'margen') + pg_temp.tmc_n(mb, 'margen') is distinct from pg_temp.tmc_n(m, 'margen')
     or pg_temp.tmc_n(ma, 'venta') + pg_temp.tmc_n(mb, 'venta') is distinct from pg_temp.tmc_n(m, 'venta') then
    raise exception 'R1: no cuadra con margen_vehiculo: %, %, %', ma, mb, m;
  end if;
end $$;
rollback;

-- @test tablero: R2 · dinero: el vehículo cae en el período de su último pago confirmado, con todos sus pagos
begin;
do $$
declare o uuid := pg_temp.tmc_origen('TMC origen R2'); e uuid := pg_temp.tmc_vehiculo(o); f uuid := pg_temp.tmc_vehiculo(o);
  q uuid := pg_temp.tmc_persona(array['logistica.margen.ver:todos:' || o]);
  v_base text := (select moneda_base::text from public.ajustes_empresa where id = 1); cat uuid; p1 uuid; p3 uuid; d date; m jsonb;
begin
  insert into public.categorias_gasto (nombre, proposito) values ('TMC R2 ' || substr(o::text, 1, 8), 'flete') returning id into cat;
  p1 := pg_temp.tmc_pago(e, v_base, 100, null, true);
  p3 := pg_temp.tmc_pago(f, v_base, 300, null, true);
  -- Un pago confirmado no se edita (trg_pago_sellado): su hora se lleva 40 días atrás sin triggers, dentro de la transacción.
  perform set_config('session_replication_role', 'replica', true);
  update public.pagos set confirmado_en = now() - interval '40 days' where id in (p1, p3);
  perform set_config('session_replication_role', 'origin', true);
  perform pg_temp.tmc_pago(e, v_base, 200, null, true);
  perform pg_temp.tmc_gasto(e, cat, v_base, 50, null);
  d := ((now() - interval '40 days') at time zone pg_temp.tmc_zona())::date;
  m := pg_temp.tmc_margen(q, d - 3, d + 3);
  if (m ->> 'vehiculos')::int is distinct from 1 or pg_temp.tmc_n(m, 'venta') is distinct from 300.00 or pg_temp.tmc_n(m, 'real') is distinct from 0.00
     or pg_temp.tmc_n(m, 'margen') is distinct from 300.00 then
    raise exception 'R2: la ventana vieja debía tener sólo a F (300,00): %', m;
  end if;
  m := pg_temp.tmc_margen_mes(q);
  if (m ->> 'vehiculos')::int is distinct from 1 or pg_temp.tmc_n(m, 'venta') is distinct from 300.00 or pg_temp.tmc_n(m, 'real') is distinct from 50.00
     or pg_temp.tmc_n(m, 'margen') is distinct from 250.00 then
    raise exception 'R2: el mes en curso debía tener sólo a E con sus dos pagos (300,00 − 50,00): %', m;
  end if;
end $$;
rollback;

-- @test tablero: R3 · dinero: sin vehículos, el margen es nulo y no 0
begin;
do $$
declare t jsonb := pg_temp.tmc_terreno(); vacio uuid := pg_temp.tmc_origen('TMC vacío'); m jsonb; h date := pg_temp.tmc_hoy();
  q uuid := pg_temp.tmc_persona(array['logistica.margen.ver:todos:' || (t ->> 'o'), 'logistica.margen.ver:todos:' || (t ->> 'o2')]);
begin
  m := pg_temp.tmc_margen_mes(pg_temp.tmc_persona(array['logistica.margen.ver:todos:' || vacio]));
  if (m ->> 'vehiculos')::int is distinct from 0 or m -> 'venta' <> 'null'::jsonb or m -> 'real' <> 'null'::jsonb or m -> 'cotizado' <> 'null'::jsonb
     or m -> 'margen' <> 'null'::jsonb or (m ->> 'sin_venta')::int is distinct from 0 or m -> 'por_origen' <> '[]'::jsonb then
    raise exception 'R3: sin vehículos debía dar nulos, 0 sin venta y []: %', m;
  end if;
  -- El mes anterior del terreno de R1: nada confirmado ahí, y el pago sin confirmar de C es de hoy.
  m := pg_temp.tmc_margen(q, (date_trunc('month', h) - interval '1 month')::date, (date_trunc('month', h) - interval '1 day')::date);
  if (m ->> 'vehiculos')::int is distinct from 0 or m -> 'margen' <> 'null'::jsonb or (m ->> 'sin_venta')::int is distinct from 0 then
    raise exception 'R3: el mes anterior debía dar 0 vehículos, margen nulo y 0 sin venta: %', m;
  end if;
end $$;
rollback;

-- @test tablero: R4 · permisos: sólo los orígenes de quien mira; sin la clave, 42501 en cada una
begin;
do $$
declare t jsonb := pg_temp.tmc_terreno(); m jsonb; h date := pg_temp.tmc_hoy();
begin
  m := pg_temp.tmc_margen_mes(pg_temp.tmc_persona(array['logistica.margen.ver:todos:' || (t ->> 'o2')]));
  if (m ->> 'vehiculos')::int is distinct from 1 or pg_temp.tmc_n(m, 'margen') is distinct from 798.11 or (m ->> 'sin_venta')::int is distinct from 0
     or jsonb_array_length(m -> 'por_origen') <> 1 or m -> 'por_origen' -> 0 ->> 'origen_id' is distinct from t ->> 'o2' then
    raise exception 'R4: con la clave sólo en o2 debía ver sólo o2 (798,11): %', m;
  end if;
  perform pg_temp.tmc_da('R4: margen sin la clave', pg_temp.tmc_margen_mes(pg_temp.tmc_persona(array['tablero.metricas.ver'])), '42501');
  perform pg_temp.tmc_da('R4: cola sin gestionar',
    pg_temp.tmc_corre(pg_temp.tmc_persona(array['tablero.metricas.ver', 'web.cola.participar']),
                      format('select public.tablero_cola_web(%L, %L)', h, h)), '42501');
end $$;
rollback;

-- @test tablero: R5 · privilegios y ventana
begin;
do $$
declare f text; q uuid := pg_temp.tmc_persona(array['logistica.margen.ver', 'web.cola.gestionar']);
begin
  foreach f in array array['tablero_margen', 'tablero_cola_web'] loop
    if has_function_privilege('anon', format('public.%I(date, date)', f), 'execute') then raise exception 'R5: anon ejecuta %', f; end if;
    if not has_function_privilege('authenticated', format('public.%I(date, date)', f), 'execute') then raise exception 'R5: authenticated no ejecuta %', f; end if;
    if not exists (select 1 from pg_proc p where p.oid = format('public.%I(date, date)', f)::regprocedure and p.prosecdef
                     and p.proconfig = array['search_path=""']) then
      raise exception 'R5: % debía ser definer con search_path vacío', f;
    end if;
    perform pg_temp.tmc_da('R5: 367 días en ' || f, pg_temp.tmc_corre(q, format('select public.%I(%L, %L)', f, date '2024-01-01', date '2025-01-01')),
                           '22023', 'p_hasta');
  end loop;
end $$;
rollback;
