-- La semilla del cotizador (paso 4.08, prompt 3; `supabase/seed.sql` y `supabase/semillas/cotizador-*.sql`; docs/COTIZADOR.md › «La semilla (4.08-3)»).
-- Corre ANTES que `humo.sql`: mira la base tal como la deja el seed (la v1 de cada fórmula, los tipos de cambio sin tocar) y el humo la modifica
-- (publica la v2 de subasta_usa con el ⚙, cambia el oficial). Por eso cada bloque que necesita una persona la crea dentro de una transacción
-- que se revierte: el humo exige que su dueña sea la primera cuenta de la base.
-- Las cifras de las anclas están hechas a mano: `docs/referencias/cotizador-actual.md` (capturas 02 y 09) y `docs/referencias/excel-de-cotizacion.md`.

create or replace function pg_temp.motivo(p_sql text) returns text language plpgsql as $$
declare v_e text; v_d text; v_h text; v_m text;
begin
  execute p_sql;
  return 'sin error';
exception when others then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  v_e := sqlstate;
  return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
end $$;

create or replace function pg_temp.espera(p_sql text, p_prefijo text) returns void language plpgsql as $$
declare v text := pg_temp.motivo(p_sql);
begin
  if left(v, length(p_prefijo)) <> p_prefijo then raise exception '% debía dar «%», dio «%»', p_sql, p_prefijo, v; end if;
end $$;

-- Un número del resultado contra el esperado a mano, a 6 decimales.
create or replace function pg_temp.cerca(p_visto jsonb, p_esperado numeric, p_que text) returns void language plpgsql as $$
begin
  if p_visto is null or jsonb_typeof(p_visto) <> 'number' then raise exception '%: no es un número (%), debía dar %', p_que, p_visto, p_esperado; end if;
  if abs((p_visto #>> '{}')::numeric - p_esperado) > 0.000001 then raise exception '%: dio %, debía dar %', p_que, p_visto, p_esperado; end if;
end $$;

-- El modo de un diseño sembrado, como lo recibe evaluar_formula(): {buckets: {bucket: nodo}, total_en}.
create or replace function pg_temp.modo(p_origen uuid, p_clave text) returns jsonb language sql as $$
  select jsonb_build_object('buckets', (select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), 'total_en', m ->> 'total_en')
    from public.formulas f cross join lateral jsonb_array_elements(f.diseno -> 'cabecera' -> 'modos') m
   where f.origen_id = p_origen and f.estado = 'publicada' and m ->> 'clave' = p_clave
$$;

create or replace function pg_temp.origen(p_clave text) returns uuid language sql as $$ select id from public.origenes where clave = p_clave $$;

-- @test semilla: los cuatro tipos de cambio son los de las capturas, y el oficial es el único por defecto
do $$
declare v_n int;
begin
  select count(*) into v_n from public.tipos_cambio where clave in ('oficial', 'paralelo', 'unificado', 'aduana') and moneda_de = 'USD' and moneda_a = 'BOB' and activo;
  if v_n <> 4 then raise exception 'faltan tipos de cambio: hay % de los 4', v_n; end if;
  if (select valor from public.tipos_cambio where clave = 'oficial') <> 11.68 then raise exception 'el oficial no es 11,68'; end if;
  if (select valor from public.tipos_cambio where clave = 'paralelo') <> 12.20 then raise exception 'el paralelo no es 12,20'; end if;
  if (select valor from public.tipos_cambio where clave = 'unificado') <> 12.20 then raise exception 'el unificado no es 12,20'; end if;
  if (select valor from public.tipos_cambio where clave = 'aduana') <> 11.68 then raise exception 'la aduana no es 11,68'; end if;
  if (select array_agg(clave order by clave) from public.tipos_cambio where es_default) is distinct from array['oficial'] then raise exception 'el oficial no es el único por defecto'; end if;
  -- Todo tipo de cambio que un nodo de una fórmula sembrada nombra existe y está activo.
  if exists (
    select 1 from public.formulas f cross join lateral jsonb_array_elements(f.definicion -> 'nodos') n
     where n ->> 'tipo' = 'tipo_cambio' and not exists (select 1 from public.tipos_cambio t where t.clave = n ->> 'clave' and t.activo)
  ) then raise exception 'una fórmula sembrada nombra un tipo de cambio que no existe'; end if;
end $$;

-- @test semilla: tres orígenes con su flujo, sus fases, su plantilla v1 y una sola versión publicada con diseño y visibilidad
do $$
declare o text; v_n int;
begin
  if (select array_agg(clave order by orden, clave) from public.origenes) is distinct from array['subasta_usa', 'oficina', 'planilla_usa'] then
    raise exception 'los orígenes sembrados no son subasta_usa, oficina y planilla_usa: %', (select array_agg(clave order by orden, clave) from public.origenes);
  end if;
  -- planilla_usa va último (orden 2): las mediciones y los e2e que toman «el primero de tipo subasta por orden» siguen en subasta_usa.
  if (select tipo::text || color || orden::text from public.origenes where clave = 'planilla_usa') <> 'subasta#7a5af82' then raise exception 'planilla_usa no es de tipo subasta, #7a5af8 y orden 2'; end if;
  if (select clave from public.origenes where tipo = 'subasta' order by orden limit 1) <> 'subasta_usa' then raise exception 'el primero de tipo subasta por orden ya no es subasta_usa'; end if;
  for o in select unnest(array['subasta_usa', 'oficina', 'planilla_usa']) loop
    if not exists (select 1 from public.flujos f where f.origen_id = pg_temp.origen(o) and f.ambito = 'vehiculos') then raise exception '% no tiene flujo', o; end if;
    select count(*) into v_n from public.fases fa join public.flujos f on f.id = fa.flujo_id where f.origen_id = pg_temp.origen(o);
    if v_n < 3 then raise exception '% no tiene sus fases (%)', o, v_n; end if;
    if (select count(*) from public.fases fa join public.flujos f on f.id = fa.flujo_id where f.origen_id = pg_temp.origen(o) and fa.es_inicial) <> 1 then raise exception '% no tiene una fase inicial', o; end if;
    if not exists (select 1 from public.plantillas_tarjeta p where p.origen_id = pg_temp.origen(o) and p.estado = 'publicada' and p.version = 1) then raise exception '% no tiene su plantilla de tarjeta v1', o; end if;
    select count(*) into v_n from public.formulas where origen_id = pg_temp.origen(o);
    if v_n <> 1 then raise exception '% tiene % fórmulas, debía tener 1', o, v_n; end if;
    if not exists (select 1 from public.formulas f where f.origen_id = pg_temp.origen(o) and f.estado = 'publicada' and f.version = 1
                      and f.diseno is not null and f.visibilidad is not null and f.nota = 'Fórmula inicial') then
      raise exception '% no tiene su v1 publicada con diseño y visibilidad', o;
    end if;
  end loop;
  -- Los dos de subasta tienen las mismas fases (el mismo negocio).
  if (select array_agg(fa.nombre order by fa.orden) from public.fases fa join public.flujos f on f.id = fa.flujo_id where f.origen_id = pg_temp.origen('planilla_usa'))
     is distinct from (select array_agg(fa.nombre order by fa.orden) from public.fases fa join public.flujos f on f.id = fa.flujo_id where f.origen_id = pg_temp.origen('subasta_usa')) then
    raise exception 'planilla_usa y subasta_usa no tienen las mismas fases';
  end if;
end $$;

-- @test semilla: cada fórmula y cada diseño sembrados pasan por lo mismo que publicar (fórmula, diseño con los niveles y los tonos de la base) y su visibilidad es la compilada
do $$
declare r record; v_niv text[]; v_ret text[]; v_tonos text[];
begin
  select n.niveles, n.retirados into v_niv, v_ret from public._niveles_de_cotizacion() n;
  select array_agg(clave) into v_tonos from public.tonos;
  for r in select o.clave, f.* from public.formulas f join public.origenes o on o.id = f.origen_id loop
    perform public.validar_formula(r.definicion, r.params);
    perform public.validar_diseno(r.definicion, r.diseno, v_niv, v_ret, v_tonos);
    if r.visibilidad is distinct from public._compilar_visibilidad(r.definicion, r.diseno) then raise exception '% no trae la visibilidad que compila su diseño', r.clave; end if;
  end loop;
  -- Los tonos de los grupos son del catálogo: compra → verde, logística → amarillo, aduana → naranja.
  for r in select o.clave, f.definicion from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave in ('subasta_usa', 'planilla_usa') loop
    if (select jsonb_agg(g ->> 'tono' order by n) from jsonb_array_elements(r.definicion -> 'grupos') with ordinality t(g, n)) is distinct from '["verde", "amarillo", "naranja"]'::jsonb then
      raise exception '% no usa verde, amarillo y naranja en sus grupos', r.clave;
    end if;
  end loop;
end $$;

-- @test semilla: la visibilidad, calculada a mano: «Avanzado» es del nivel costos, el total y lo aparte los ve todo el mundo
do $$
declare o text; v_vis jsonb;
begin
  for o in select unnest(array['subasta_usa', 'planilla_usa']) loop
    select visibilidad into v_vis from public.formulas where origen_id = pg_temp.origen(o) and estado = 'publicada';
    -- Los nodos de las tres secciones «avanzado» (CIF, impuestos y póliza): ver y editar con costos.
    if (select count(*) from unnest(array['valor_tabla', 'factor_dp', 'fob', 'seguro', 'seguro_pct', 'flete', 'gasto_puerto', 'gasto_taller', 'utilidad', 'cif',
                                          'ga', 'ga_pct', 'iva', 'iva_pct', 'ice', 'ice_pct', 'total_impuesto', 'factura_taller', 'almacenaje', 'total_gastos',
                                          'agencia', 'gas_sao', 'factura_venta', 'almacenaje_salida']) k
                 where v_vis -> k = '{"ver": "costos", "editar": "costos"}'::jsonb) <> 24 then
      raise exception '%: la calculadora de póliza no es toda de costos: %', o, v_vis;
    end if;
    -- Lo de la hoja principal, de todos.
    if (select count(*) from unnest(array['variante', 'cuenta_especial_usa', 'remate', 'fees', 'transferencia', 'cuenta_especial', 'grua', 'transporte_bolivia',
                                          'transporte_chile', 'comision', 'documentacion', 'export', 'nacionalizacion', 'garantia'] ) k
                 where v_vis -> k = '{"ver": "todos", "editar": "todos"}'::jsonb) <> 14 then
      raise exception '%: la hoja principal no es de todos: %', o, v_vis;
    end if;
    if v_vis -> 'total' is distinct from '{"ver": "todos", "editar": null}'::jsonb then raise exception '%: el total no es {todos, sin editar}', o; end if;
    if v_vis ? 'anio' then raise exception '%: un nodo que no se dibuja viaja', o; end if;
  end loop;
  select visibilidad into v_vis from public.formulas where origen_id = pg_temp.origen('subasta_usa') and estado = 'publicada';
  if v_vis -> 'mostrar_garantia' is distinct from '{"ver": "todos", "editar": "todos"}'::jsonb or v_vis -> 'tc_unificado' is distinct from '{"ver": "todos", "editar": "todos"}'::jsonb then
    raise exception 'subasta_usa: el interruptor de la garantía o el unificado no son de todos';
  end if;
  -- oficina no tiene niveles.
  select visibilidad into v_vis from public.formulas where origen_id = pg_temp.origen('oficina') and estado = 'publicada';
  if v_vis is distinct from '{"precio": {"ver": "todos", "editar": "todos"}, "descuento": {"ver": "todos", "editar": "todos"}, "total": {"ver": "todos", "editar": null}}'::jsonb then
    raise exception 'oficina: la visibilidad no es la de dos celdas y el total: %', v_vis;
  end if;
end $$;

-- @test semilla: las tablas de referencia vivas son las que la versión congela, fila por fila y en orden; el transporte es el del Excel
do $$
declare o text; k text; v_params jsonb; v_vivas jsonb; v_n int;
begin
  for o in select unnest(array['subasta_usa', 'planilla_usa']) loop
    select params into v_params from public.formulas where origen_id = pg_temp.origen(o) and estado = 'publicada';
    select count(*) into v_n from public.tablas_referencia where origen_id = pg_temp.origen(o);
    if v_n <> 4 or v_n <> (select count(*) from jsonb_object_keys(v_params -> 'tablas')) then raise exception '%: % tablas vivas, debía haber 4, las congeladas', o, v_n; end if;
    for k in select jsonb_object_keys(v_params -> 'tablas') loop
      select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb) into v_vivas
        from public.tablas_referencia t join public.tablas_referencia_filas f on f.tabla_id = t.id
       where t.origen_id = pg_temp.origen(o) and t.clave = k and f.activa;
      if v_vivas is distinct from v_params -> 'tablas' -> k or jsonb_array_length(v_vivas) = 0 then
        raise exception '%: la tabla viva «%» no es la congelada: % contra %', o, k, v_vivas, v_params -> 'tablas' -> k;
      end if;
    end loop;
    -- El transporte, a mano (excel-de-cotizacion.md, «Tablas de referencia»): oficina / cliente.
    if (select f.valores from public.tablas_referencia t join public.tablas_referencia_filas f on f.tabla_id = t.id
         where t.origen_id = pg_temp.origen(o) and t.clave = 'transporte_usa_bolivia' and f.valores ->> 'tipo' = 'autos') is distinct from '{"tipo": "autos", "oficina": 2700, "cliente": 3000}'::jsonb then
      raise exception '%: autos a Bolivia no es 2700 / 3000', o;
    end if;
    if (select f.valores from public.tablas_referencia t join public.tablas_referencia_filas f on f.tabla_id = t.id
         where t.origen_id = pg_temp.origen(o) and t.clave = 'transporte_usa_bolivia' and f.valores ->> 'tipo' = 'camionetas_grandes') is distinct from '{"tipo": "camionetas_grandes", "oficina": 3700, "cliente": 4000}'::jsonb then
      raise exception '%: camionetas grandes a Bolivia no es 3700 / 4000', o;
    end if;
    if (select f.valores from public.tablas_referencia t join public.tablas_referencia_filas f on f.tabla_id = t.id
         where t.origen_id = pg_temp.origen(o) and t.clave = 'transporte_usa_chile' and f.valores ->> 'tipo' = 'vagonetas_medianas') is distinct from '{"tipo": "vagonetas_medianas", "oficina": 3000, "cliente": 3300}'::jsonb then
      raise exception '%: vagonetas medianas a Chile no es 3000 / 3300', o;
    end if;
    if (select f.valores from public.tablas_referencia t join public.tablas_referencia_filas f on f.tabla_id = t.id
         where t.origen_id = pg_temp.origen(o) and t.clave = 'transporte_usa_bolivia' and f.valores ->> 'tipo' = 'motos') is distinct from '{"tipo": "motos", "oficina": null, "cliente": null}'::jsonb then
      raise exception '%: las motos no son «X» (nulas)', o;
    end if;
  end loop;
  if exists (select 1 from public.tablas_referencia where origen_id = pg_temp.origen('oficina')) then raise exception 'oficina no tiene tablas'; end if;
end $$;

-- @test semilla: el check «una versión publicada o archivada tiene diseño y visibilidad»; un borrador puede no tenerlos
do $$
declare o uuid; v_def jsonb := '{"nodos": [{"id": "total", "tipo": "constante", "etiqueta": "Total", "salida": "total"}]}';
begin
  insert into public.origenes (clave, nombre) values ('prueba_check', 'Prueba del check') returning id into o;
  -- Un borrador sin diseño ni visibilidad: pasa.
  insert into public.formulas (origen_id, estado, definicion) values (o, 'borrador', v_def);
  perform pg_temp.espera(format($f$insert into public.formulas (origen_id, version, estado, definicion) values (%L, 1, 'publicada', %L)$f$, o, v_def), '23514:');
  perform pg_temp.espera(format($f$insert into public.formulas (origen_id, version, estado, definicion, diseno) values (%L, 1, 'publicada', %L, '{}')$f$, o, v_def), '23514:');
  perform pg_temp.espera(format($f$insert into public.formulas (origen_id, version, estado, definicion, visibilidad) values (%L, 1, 'publicada', %L, '{}')$f$, o, v_def), '23514:');
  perform pg_temp.espera(format($f$insert into public.formulas (origen_id, version, estado, definicion, diseno) values (%L, 1, 'archivada', %L, '{}')$f$, o, v_def), '23514:');
  -- Con las dos, pasa; y publicar o archivar una existente sin ellas no.
  insert into public.formulas (origen_id, version, estado, definicion, diseno, visibilidad) values (o, 1, 'archivada', v_def, '{}', '{}');
  perform pg_temp.espera(format($f$update public.formulas set estado = 'publicada', version = 2 where origen_id = %L and estado = 'borrador'$f$, o), '23514:');
  if (select conname from pg_constraint where conrelid = 'public.formulas'::regclass and contype = 'c' and conname = 'formulas_publicada_con_diseno') is null then
    raise exception 'el check no se llama formulas_publicada_con_diseno';
  end if;
  delete from public.origenes where id = o;
end $$;

-- @test semilla: la v1 de subasta_usa reproduce las capturas 02 y 09 con cotizacion_evaluar y el modo Unificado del diseño sembrado
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'semilla@ejemplo.com');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$
declare
  o uuid := pg_temp.origen('subasta_usa'); v_veh uuid; r jsonb;
begin
  insert into public.vehiculos (origen_id, titulo, anio, atributos) values (o, 'Semilla', 2025, '{"tipo_vehiculo": "autos"}') returning id into v_veh;

  -- Captura 02: todo en cero, la póliza (1.201) tipeada. 1.200 × 12,2 + 1.201 × 11,68 = 28.667,68 Bs; ÷ 12,2 = 2.349,8098… → $2.350.
  r := public.cotizacion_evaluar('{"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}}', null, o, v_veh, pg_temp.modo(o, 'unificado'));
  perform pg_temp.cerca(r #> '{totales,bs}', 28667.68, 'captura 02, Bs');
  perform pg_temp.cerca(r #> '{totales,usd}', 2349.809836065574, 'captura 02, USD');
  perform pg_temp.cerca(r #> '{totales,suma_usd}', 2401, 'captura 02, suma en USD');
  if round((r #>> '{totales,usd}')::numeric) <> 2350 then raise exception 'la captura 02 no muestra $2.350'; end if;
  if r -> 'faltantes' <> '[]'::jsonb then raise exception 'captura 02: faltan datos: %', r -> 'faltantes'; end if;

  -- El mismo modo en Paralelo (el otro modo del diseño): todo al paralelo menos la aduana, que va al oficial: (1.200 × 12,2 + 1.201 × 11,68) ÷ 12,2.
  r := public.cotizacion_evaluar('{"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}}', null, o, v_veh, pg_temp.modo(o, 'paralelo'));
  perform pg_temp.cerca(r #> '{totales,bs}', 28667.68, 'captura 02 en paralelo, Bs');

  -- Captura 02 con la póliza calculada por la calculadora de «Avanzado»: CIF 1.155, GA 57,75, IVA 181,18485, ICE 181,9125, nacionalización 1.200,84735.
  r := public.cotizacion_evaluar('{"inputs": {"valor_tabla": 0}, "overrides": {"transporte_bolivia": 0}}', null, o, v_veh, pg_temp.modo(o, 'unificado'));
  perform pg_temp.cerca(r #> '{valores,cif}', 1155, 'CIF');
  perform pg_temp.cerca(r #> '{valores,ga}', 57.75, 'GA');
  perform pg_temp.cerca(r #> '{valores,iva}', 181.18485, 'IVA');
  perform pg_temp.cerca(r #> '{valores,ice}', 181.9125, 'ICE');
  perform pg_temp.cerca(r #> '{valores,nacionalizacion}', 1200.84735, 'nacionalización');
  perform pg_temp.cerca(r #> '{totales,bs}', 28665.897048, 'captura 02 calculada, Bs');
  perform pg_temp.cerca(r #> '{totales,usd}', 2349.6636925, 'captura 02 calculada, USD');

  -- Captura 09: un 4Runner híbrido, el unificado sobrescrito a 12. (53.610,4 × 12 + 19.871 × 11,68) ÷ 12 = 72.951,5067 → $72.952; garantía 5.925.
  -- El transporte de 3.700 sale de la fila sembrada de las vagonetas grandes.
  update public.vehiculos set atributos = '{"tipo_vehiculo": "vagonetas_grandes"}' where id = v_veh;
  r := public.cotizacion_evaluar(
    '{"variante": "hibrido", "inputs": {"remate": 39500, "grua": 1790}, "banderas": {"mostrar_garantia": true}, "overrides": {"tc_unificado": 12, "nacionalizacion": 19871}}',
    null, o, v_veh, pg_temp.modo(o, 'unificado'));
  perform pg_temp.cerca(r #> '{valores,transporte_bolivia}', 3700, 'transporte de la fila sembrada');
  perform pg_temp.cerca(r #> '{totales,grupos,compra,usd}', 46420.4, 'captura 09, compra');
  perform pg_temp.cerca(r #> '{totales,grupos,logistica,usd}', 7190, 'captura 09, logística');
  perform pg_temp.cerca(r #> '{totales,bs}', 875418.08, 'captura 09, Bs');
  perform pg_temp.cerca(r #> '{totales,usd}', 72951.50666666667, 'captura 09, USD');
  perform pg_temp.cerca(r #> '{valores,garantia}', 5925, 'captura 09, garantía');
  if round((r #>> '{totales,usd}')::numeric) <> 72952 then raise exception 'la captura 09 no muestra $72.952'; end if;
  if r -> 'faltantes' <> '[]'::jsonb then raise exception 'captura 09: faltan datos: %', r -> 'faltantes'; end if;
end $$;
rollback;

-- @test semilla: el transporte de subasta_usa es sobrescribible; sin vehículo o con un tipo que la tabla no tiene queda sin valor, con su motivo
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'semilla@ejemplo.com');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$
declare
  o uuid := pg_temp.origen('subasta_usa'); v_veh uuid; r jsonb;
begin
  -- Sin vehículo: sin valor, el total sin valor y el motivo (no se sabe el tipo de vehículo).
  r := public.cotizacion_evaluar('{"inputs": {"remate": 10000}, "overrides": {"nacionalizacion": 1000}}', null, o, null, null);
  if r #> '{valores,transporte_bolivia}' <> 'null'::jsonb then raise exception 'sin vehículo hay transporte: %', r #> '{valores,transporte_bolivia}'; end if;
  if r #> '{totales,usd}' <> 'null'::jsonb then raise exception 'sin transporte el total no es null'; end if;
  if not (r -> 'faltantes' @> '[{"codigo": "campo_sin_valor", "donde": "transporte_bolivia"}]') then raise exception 'falta el motivo del transporte: %', r -> 'faltantes'; end if;
  -- Tipeado (el asesor lo escribe, como en el Excel): el total ya no es null y la fuente es la del override.
  r := public.cotizacion_evaluar('{"inputs": {"remate": 10000}, "overrides": {"nacionalizacion": 1000, "transporte_bolivia": 3000}}', null, o, null, null);
  perform pg_temp.cerca(r #> '{valores,transporte_bolivia}', 3000, 'transporte tipeado');
  if r #> '{fuentes,transporte_bolivia}' <> '"override"'::jsonb then raise exception 'el transporte tipeado no es un override'; end if;
  if r #> '{totales,usd}' = 'null'::jsonb then raise exception 'tipeado, el total sigue siendo null'; end if;
  -- Un tipo que la tabla no tiene (lo que trae la subasta): sin valor y el motivo es otro.
  insert into public.vehiculos (origen_id, titulo, anio, atributos) values (o, 'Semilla', 2025, '{"tipo_vehiculo": "AUTOMOBILE"}') returning id into v_veh;
  r := public.cotizacion_evaluar('{"inputs": {"remate": 10000}, "overrides": {"nacionalizacion": 1000}}', null, o, v_veh, null);
  if not (r -> 'faltantes' @> '[{"codigo": "fila_sin_coincidencia", "donde": "transporte_bolivia"}]') then raise exception 'falta el motivo del tipo desconocido: %', r -> 'faltantes'; end if;
  -- Con el tipo de la tabla, el valor sugerido es el de la fila: autos, 3.000.
  update public.vehiculos set atributos = '{"tipo_vehiculo": "autos"}' where id = v_veh;
  r := public.cotizacion_evaluar('{"inputs": {"remate": 10000}, "overrides": {"nacionalizacion": 1000}}', null, o, v_veh, null);
  perform pg_temp.cerca(r #> '{valores,transporte_bolivia}', 3000, 'transporte sugerido de autos');
  if r #> '{fuentes,transporte_bolivia}' <> '"sugerido"'::jsonb then raise exception 'el transporte de la tabla no es sugerido'; end if;
end $$;
rollback;

-- @test semilla: planilla_usa reproduce los totales que guarda el Excel (con el oficial 9,73 y el paralelo 10 de su hoja) y oficina da lo suyo
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'semilla@ejemplo.com');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$
declare
  o uuid := pg_temp.origen('planilla_usa'); v_veh uuid; r jsonb;
begin
  insert into public.vehiculos (origen_id, titulo, anio, atributos) values (o, 'Planilla', 2025, '{"tipo_vehiculo": "motos"}') returning id into v_veh;

  -- La moto (H22): fees, transporte y nacionalización tipeados. TOTAL DÓLARES 16.826,354; la suma en dólares, 16.910; Bs 168.263,54.
  r := public.cotizacion_evaluar(
    '{"variante": "moto", "inputs": {"remate": 9500, "grua": 880}, "overrides": {"tc_oficial": 9.73, "tc_paralelo": 10, "fees": 1300, "transporte_bolivia": 1300, "nacionalizacion": 3098}}',
    null, o, v_veh, null);
  perform pg_temp.cerca(r #> '{totales,usd}', 16826.354, 'moto, TOTAL DÓLARES');
  perform pg_temp.cerca(r #> '{totales,suma_usd}', 16910, 'moto, suma en USD');
  perform pg_temp.cerca(r #> '{totales,bs}', 168263.54, 'moto, Bs');
  if r -> 'faltantes' <> '[]'::jsonb then raise exception 'moto: faltan datos: %', r -> 'faltantes'; end if;

  -- El auto a gasolina (H41): el transporte (3.600) es el de la tabla; TOTAL DÓLARES 43.756,416; suma 44.344,8.
  update public.vehiculos set atributos = '{"tipo_vehiculo": "vagonetas_medianas"}' where id = v_veh;
  r := public.cotizacion_evaluar(
    '{"inputs": {"remate": 14000, "grua": 1300}, "overrides": {"tc_oficial": 9.73, "tc_paralelo": 10, "nacionalizacion": 21792}}', null, o, v_veh, null);
  perform pg_temp.cerca(r #> '{valores,transporte_bolivia}', 3600, 'gasolina, transporte de la tabla');
  perform pg_temp.cerca(r #> '{totales,usd}', 43756.416, 'gasolina, TOTAL DÓLARES');
  perform pg_temp.cerca(r #> '{totales,suma_usd}', 44344.8, 'gasolina, suma en USD');

  -- El híbrido (H60): 61.710,6; suma 62.256.
  r := public.cotizacion_evaluar(
    '{"variante": "hibrido", "inputs": {"remate": 30000, "grua": 1500}, "overrides": {"tc_oficial": 9.73, "tc_paralelo": 10, "nacionalizacion": 20200}}', null, o, v_veh, null);
  perform pg_temp.cerca(r #> '{totales,usd}', 61710.6, 'híbrido, TOTAL DÓLARES');
  perform pg_temp.cerca(r #> '{totales,suma_usd}', 62256, 'híbrido, suma en USD');

  -- EE. UU. → Chile (H73): sin aduana, el transporte de la tabla de Chile (3.300); 20.157,6.
  r := public.cotizacion_evaluar(
    '{"variante": "chile", "inputs": {"remate": 13000, "grua": 1180}, "overrides": {"tc_oficial": 9.73, "tc_paralelo": 10}}', null, o, v_veh, null);
  perform pg_temp.cerca(r #> '{valores,transporte_chile}', 3300, 'Chile, transporte de la tabla');
  perform pg_temp.cerca(r #> '{totales,usd}', 20157.6, 'Chile, TOTAL DÓLARES');
  perform pg_temp.cerca(r #> '{totales,suma_usd}', 20157.6, 'Chile, suma en USD');

  -- oficina: 25.000 − 1.500 = 23.500; al paralelo de la empresa (12,20) son 286.700 Bs.
  r := public.cotizacion_evaluar('{"inputs": {"precio": 25000, "descuento": 1500}}', null, pg_temp.origen('oficina'), null, null);
  perform pg_temp.cerca(r #> '{totales,usd}', 23500, 'oficina, total');
  perform pg_temp.cerca(r #> '{totales,bs}', 286700, 'oficina, Bs');
end $$;
rollback;
