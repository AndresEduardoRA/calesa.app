-- cotizacion_evaluar() contra evaluar_formula() (paso 4.06, prompt 2; docs/COTIZADOR.md › «En la base (4.06-2)»).
-- `scripts/probar-schema.mjs` carga antes los JSON en tablas temporales (la base no lee archivos del repo):
--   _corpus_del_motor ← supabase/tests/corpus-del-motor.json (el juego de 84 casos, el corpus diferencial y las fórmulas)
-- La paridad: para cada caso REPRODUCIBLE se siembran en la base lo que `cotizacion_evaluar()` lee (la fórmula publicada del origen, sus
-- tablas con `orden` = la posición de la fila, los tipos de cambio, el vehículo con sus campos) y se llama con lo que la persona tipea
-- (inputs, banderas, overrides, variante). Tiene que dar EXACTAMENTE lo que `evaluar()` da con la entrada entera: el resultado, o el
-- error de llamada con su código y su `donde`.
-- Un caso no es reproducible si pide lo que la base no puede guardar o no deja pasar: un tipo de cambio con más de 6 decimales (la
-- tabla es numeric(18,6)), un año fuera de 1900–2100, un campo cuyo nombre no es la clave de un campo del origen (con punto, de una
-- letra o con mayúsculas), un valor del vehículo que no es número ni texto, una entrada sin alguno de sus seis miembros, o una tabla de
-- la entrada que la fórmula no lee con una forma que `evaluar()` rechazaría. Cada salto se cuenta por su motivo y el conteo se asserta.

-- @test cotizacion_evaluar: ayudantes (la igualdad exacta de dos jsonb y un caso de paridad en su propia subtransacción)
create or replace function pg_temp.iguales(a jsonb, b jsonb)
returns boolean language plpgsql as $$
declare
  k text;
  i int;
begin
  if jsonb_typeof(a) is distinct from jsonb_typeof(b) then return false; end if;
  case jsonb_typeof(a)
    when 'number' then
      return a::float8 = b::float8;
    when 'array' then
      if jsonb_array_length(a) <> jsonb_array_length(b) then return false; end if;
      for i in 0 .. jsonb_array_length(a) - 1 loop
        if not pg_temp.iguales(a -> i, b -> i) then return false; end if;
      end loop;
      return true;
    when 'object' then
      if (select count(*) from jsonb_object_keys(a)) <> (select count(*) from jsonb_object_keys(b)) then return false; end if;
      for k in select jsonb_object_keys(a) loop
        if not (b ? k) or not pg_temp.iguales(a -> k, b -> k) then return false; end if;
      end loop;
      return true;
    else
      return a = b;
  end case;
end $$;

-- Un caso: devuelve (salto, ok, esperado, visto). Lo que siembra queda dentro de una subtransacción que se deshace al final.
create function pg_temp.un_caso(p_caso jsonb, p_formulas jsonb, p_origen uuid, p_formula uuid, p_vehiculo uuid)
returns table (salto text, ok boolean, esperado text, visto text) language plpgsql as $$
declare
  v_formula jsonb := p_formulas -> (p_caso ->> 'formula');
  v_texto jsonb := coalesce(p_caso -> 'texto', '{}'::jsonb);
  v_def jsonb := case when v_texto ? 'definicion' then (v_texto ->> 'definicion')::jsonb else v_formula -> 'definicion' end;
  v_par jsonb := case when v_texto ? 'params' then (v_texto ->> 'params')::jsonb else v_formula -> 'params' end;
  v_ent jsonb := case when v_texto ? 'entrada' then (v_texto ->> 'entrada')::jsonb else p_caso -> 'entrada' end;
  v_modo jsonb := case when v_texto ? 'modo' then (v_texto ->> 'modo')::jsonb else p_caso -> 'modo' end;
  v_esp jsonb := p_caso -> 'esperado';
  v_entradas jsonb;
  v_miembro text;
  r record;
  v_leidas text[];
  v_anio smallint; v_marca text; v_modelo text; v_km int; v_precio numeric; v_attr jsonb := '{}'::jsonb;
  v_res jsonb;
  v_estado text; v_detalle text; v_pista text; v_mensaje text;
begin
  esperado := case when v_esp ? 'resultado' then 'resultado' else (v_esp -> 'error' ->> 'codigo') || '@' || coalesce(v_esp -> 'error' ->> 'donde', '') end;

  -- ¿Se puede reproducir?
  if jsonb_typeof(v_ent) <> 'object' then salto := 'entrada que no es un objeto'; return next; return; end if;
  if exists (select 1 from jsonb_object_keys(v_ent) k
              where k not in ('inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'variante', 'overrides')) then
    salto := 'entrada con una clave de más'; return next; return;
  end if;
  foreach v_miembro in array array['inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'overrides'] loop
    if not (v_ent ? v_miembro) then salto := 'entrada sin ' || v_miembro; return next; return; end if;
  end loop;
  if jsonb_typeof(v_ent -> 'tipos_cambio') <> 'object' or jsonb_typeof(v_ent -> 'vehiculo') <> 'object'
     or jsonb_typeof(v_ent -> 'tablas') <> 'object' then
    salto := 'tipos de cambio, vehículo o tablas que no son un objeto'; return next; return;
  end if;
  for r in select e.key, e.value from jsonb_each(v_ent -> 'tipos_cambio') e loop
    if r.key !~ '^[a-z][a-z0-9_]{0,40}$' then salto := 'clave de tipo de cambio que no es un id'; return next; return; end if;
    if jsonb_typeof(r.value) <> 'number' or (r.value)::numeric <= 0 or (r.value)::numeric >= 1e12
       or round((r.value)::numeric, 6) <> (r.value)::numeric then
      salto := 'tipo de cambio que la tabla no guarda (más de 6 decimales, no positivo o enorme)'; return next; return;
    end if;
  end loop;
  for r in select e.key, e.value from jsonb_each(v_ent -> 'vehiculo') e loop
    if r.key !~ '^[a-z][a-z0-9_]{1,40}$' then salto := 'campo que no es la clave de un campo del origen'; return next; return; end if;
    if jsonb_typeof(r.value) = 'null' then continue; end if;
    if r.key = 'anio' then
      if jsonb_typeof(r.value) <> 'number' or (r.value)::numeric <> trunc((r.value)::numeric) or (r.value)::numeric not between 1900 and 2100 then
        salto := 'año que no es un entero de 1900 a 2100'; return next; return;
      end if;
    elsif r.key in ('marca', 'modelo') then
      if jsonb_typeof(r.value) <> 'string' or char_length(r.value #>> '{}') > 200 then salto := 'marca o modelo que no es un texto'; return next; return; end if;
    elsif r.key = 'kilometraje' then
      if jsonb_typeof(r.value) <> 'number' or (r.value)::numeric <> trunc((r.value)::numeric) or abs((r.value)::numeric) > 2000000000 then
        salto := 'kilometraje que no es un entero'; return next; return;
      end if;
    elsif r.key = 'precio' then
      if jsonb_typeof(r.value) <> 'number' or round((r.value)::numeric, 2) <> (r.value)::numeric or abs((r.value)::numeric) >= 1e16 then
        salto := 'precio con más de 2 decimales'; return next; return;
      end if;
    elsif jsonb_typeof(r.value) not in ('number', 'string') or (jsonb_typeof(r.value) = 'string' and char_length(r.value #>> '{}') > 200) then
      salto := 'valor del vehículo que no es un número ni un texto corto'; return next; return;
    elsif jsonb_typeof(r.value) = 'number' and abs((r.value)::numeric) >= 1e308 then
      -- evaluar() lo rechaza como entrada inválida; la base no rompe la hoja por un dato del vehículo que no cabe en un doble: no llega.
      salto := 'número del vehículo que no cabe en un doble'; return next; return;
    end if;
  end loop;
  -- Lo que la fórmula lee: los `tabla` de sus nodos que no congeló. Una tabla de la entrada que no lee no se siembra, así que sólo
  -- se salta si `evaluar()` la rechazaría por su forma.
  select coalesce(array_agg(distinct n ->> 'tabla'), '{}') into v_leidas
    from jsonb_array_elements(v_def -> 'nodos') n
   where n ->> 'tabla' is not null and not (coalesce(v_par -> 'tablas', '{}'::jsonb) ? (n ->> 'tabla'));
  for r in select e.key, e.value from jsonb_each(v_ent -> 'tablas') e loop
    if jsonb_typeof(r.value) <> 'array' or r.key !~ '^[a-z][a-z0-9_]{0,40}$' then
      salto := 'tabla de la entrada que no es un arreglo o con una clave que no es un id'; return next; return;
    end if;
    if not (r.key = any (v_leidas)) and v_esp -> 'error' ->> 'codigo' = 'entrada_invalida' and coalesce(v_esp -> 'error' ->> 'donde', '') like 'tablas%' then
      salto := 'tabla que la fórmula no lee, con una forma que evaluar() rechaza'; return next; return;
    end if;
  end loop;

  -- La siembra, dentro de una subtransacción que se deshace.
  begin
    update public.formulas set definicion = v_def, params = v_par where id = p_formula;
    insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
      select p_origen, k, k, '[]'::jsonb from jsonb_object_keys(v_ent -> 'tablas') k;
    insert into public.tablas_referencia_filas (tabla_id, valores, orden)
      select t.id, f.value, (f.ordinality - 1)::smallint
        from jsonb_each(v_ent -> 'tablas') e
        join public.tablas_referencia t on t.origen_id = p_origen and t.clave = e.key
        cross join lateral jsonb_array_elements(e.value) with ordinality f (value, ordinality);
    update public.tipos_cambio set activo = false;
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, activo, orden)
      select e.key, e.key, 'USD', 'BOB', (e.value)::numeric, true, 0 from jsonb_each(v_ent -> 'tipos_cambio') e
      on conflict (clave) do update set valor = excluded.valor, activo = true;
    for r in select e.key, e.value from jsonb_each(v_ent -> 'vehiculo') e where jsonb_typeof(e.value) <> 'null' loop
      case r.key
        when 'anio' then v_anio := (r.value)::int;
        when 'marca' then v_marca := r.value #>> '{}';
        when 'modelo' then v_modelo := r.value #>> '{}';
        when 'kilometraje' then v_km := (r.value)::int;
        when 'precio' then v_precio := (r.value)::numeric;
        else
          insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, activo)
            values (p_origen, r.key, r.key, case when jsonb_typeof(r.value) = 'number' then 'numero' else 'texto' end::public.tipo_campo, true)
            on conflict (origen_id, clave) do update set tipo = excluded.tipo, activo = true;
          v_attr := v_attr || jsonb_build_object(r.key, r.value);
      end case;
    end loop;
    update public.vehiculos set anio = v_anio, marca = v_marca, modelo = v_modelo, kilometraje = v_km, precio = v_precio, atributos = v_attr
     where id = p_vehiculo;

    -- Lo que la persona tipea: sólo inputs, banderas, overrides y variante.
    v_entradas := jsonb_build_object('inputs', v_ent -> 'inputs', 'banderas', v_ent -> 'banderas', 'overrides', v_ent -> 'overrides');
    if v_ent ? 'variante' then v_entradas := v_entradas || jsonb_build_object('variante', v_ent -> 'variante'); end if;
    begin
      v_res := public.cotizacion_evaluar(v_entradas, null, p_origen, p_vehiculo, v_modo);
      visto := 'resultado';
      ok := v_esp ? 'resultado' and pg_temp.iguales(v_res, v_esp -> 'resultado');
    exception when others then
      get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail,
                              v_pista = pg_exception_hint, v_mensaje = message_text;
      visto := case when v_estado = '22023' and v_detalle <> '' then v_detalle || '@' || coalesce(v_pista, '')
                    else format('lanzó %s: %s', v_estado, v_mensaje) end;
      ok := visto = esperado;
    end;
    raise exception using errcode = 'RB001', message = 'deshacer la siembra';
  exception when sqlstate 'RB001' then null;
  end;
  salto := null;
  return next;
end $$;

-- @test cotizacion_evaluar: el juego de 84 casos y el corpus dan lo mismo que evaluar_formula() con la entrada entera
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_origen uuid; v_formula uuid; v_vehiculo uuid;
  v_juego jsonb := (select doc -> 'juego' from _corpus_del_motor);
  v_casos jsonb := (select doc -> 'casos' from _corpus_del_motor);
  v_formulas jsonb := (select doc -> 'formulas' from _corpus_del_motor);
  v_malos text[]; v_saltos text; v_corridos_juego int; v_corridos_corpus int; v_resultados int; v_errores int;
begin
  insert into public.origenes (clave, nombre) values ('cot_eval_paridad', 'Paridad de cotizacion_evaluar') returning id into v_origen;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', '{}', '{}') returning id into v_formula;
  insert into public.vehiculos (origen_id, titulo) values (v_origen, 'Paridad') returning id into v_vehiculo;

  create temp table _paridad_cotizacion on commit drop as
    select c.grupo, c.nombre, u.salto, u.ok, u.esperado, u.visto
      from (select x ->> 'nombre' as nombre, 'juego' as grupo, x from jsonb_array_elements(v_juego) x
            union all select x ->> 'nombre', 'corpus', x from jsonb_array_elements(v_casos) x) c
      cross join lateral pg_temp.un_caso(c.x, v_formulas, v_origen, v_formula, v_vehiculo) u;

  select count(*) filter (where salto is null and grupo = 'juego'), count(*) filter (where salto is null and grupo = 'corpus'),
         count(*) filter (where salto is null and esperado = 'resultado'), count(*) filter (where salto is null and esperado <> 'resultado')
    into v_corridos_juego, v_corridos_corpus, v_resultados, v_errores
    from _paridad_cotizacion;
  select string_agg(format('%s × %s', salto, n), '; ' order by n desc) into v_saltos
    from (select salto, count(*) n from _paridad_cotizacion where salto is not null group by salto) s;
  raise notice 'cotizacion_evaluar: % casos del juego y % del corpus reproducidos (% resultados, % errores de llamada); saltos: %',
    v_corridos_juego, v_corridos_corpus, v_resultados, v_errores, coalesce(v_saltos, 'ninguno');
  -- Un corpus que se salta casi todo no compara nada.
  if v_corridos_juego < 80 or v_corridos_corpus < 580 then
    raise exception 'sólo se reprodujeron % del juego y % del corpus; saltos: %', v_corridos_juego, v_corridos_corpus, v_saltos;
  end if;
  if v_resultados < 440 or v_errores < 200 then
    raise exception 'lo reproducido tiene % resultados y % errores de llamada', v_resultados, v_errores;
  end if;
  select array_agg(format('[%s] %s: esperado %s, visto %s', grupo, nombre, esperado, visto)) into v_malos
    from _paridad_cotizacion where salto is null and not ok;
  if v_malos is not null then
    raise exception '% casos no dan lo de evaluar_formula():%', cardinality(v_malos), E'\n  ' || array_to_string(v_malos[1:40], E'\n  ');
  end if;
end $$;
rollback;

-- Una fórmula chica que lee una tabla por el campo `marca` del vehículo, un tipo de cambio y una constante. Los tests de abajo la usan.
create function pg_temp.formula_chica() returns jsonb language sql as $$
  select '{"nodos": [
    {"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
    {"id": "c", "tipo": "constante", "etiqueta": "C", "formato": "usd"},
    {"id": "x", "tipo": "tabla", "tabla": "t", "match": {"marca": "marca"}, "columna": "v", "etiqueta": "X", "formato": "usd"},
    {"id": "total", "tipo": "calculo", "op": "suma", "de": ["c", "x"], "etiqueta": "Total", "formato": "usd", "salida": "total", "bucket": "b"}
  ], "buckets": {"b": "tc"}}'::jsonb
$$;

-- @test cotizacion_evaluar: «la primera fila» es la de menor orden y, con el orden repetido, la de menor id: no depende de cómo se insertó
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_origen uuid; v_tabla uuid; v_vehiculo uuid; v_x jsonb;
  v_chico uuid := '00000000-0000-0000-0000-000000000001'; v_grande uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
begin
  perform public.validar_formula(pg_temp.formula_chica(), '{"c": 10}');
  insert into public.origenes (clave, nombre) values ('cot_eval_orden', 'Orden de las filas') returning id into v_origen;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', pg_temp.formula_chica(), '{"c": 10}');
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'Orden', 'toyota') returning id into v_vehiculo;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_origen, 't', 'T', '[]') returning id into v_tabla;
  -- El grande entra primero y vale 1; el chico entra segundo y vale 2; los dos con orden 0. Gana el chico: el 2.
  insert into public.tablas_referencia_filas (id, tabla_id, valores, orden) values (v_grande, v_tabla, '{"marca": "toyota", "v": 1}', 0);
  insert into public.tablas_referencia_filas (id, tabla_id, valores, orden) values (v_chico, v_tabla, '{"marca": "toyota", "v": 2}', 0);
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_tabla, '{"marca": "toyota", "v": 9}', 5);
  v_x := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo) -> 'valores' -> 'x';
  if v_x <> '2' then raise exception 'con el orden repetido ganó %, y debía ganar el id menor (2)', v_x; end if;
  -- Al revés: el valor 1 en el id menor y el 2 en el mayor, insertados en el otro orden.
  delete from public.tablas_referencia_filas where tabla_id = v_tabla;
  insert into public.tablas_referencia_filas (id, tabla_id, valores, orden) values (v_chico, v_tabla, '{"marca": "toyota", "v": 1}', 0);
  insert into public.tablas_referencia_filas (id, tabla_id, valores, orden) values (v_grande, v_tabla, '{"marca": "toyota", "v": 2}', 0);
  v_x := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo) -> 'valores' -> 'x';
  if v_x <> '1' then raise exception 'con los ids al revés ganó %, y debía ganar el id menor (1)', v_x; end if;
  -- Un orden menor gana al id: el 9 con orden -1.
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_tabla, '{"marca": "toyota", "v": 9}', -1);
  v_x := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo) -> 'valores' -> 'x';
  if v_x <> '9' then raise exception 'el orden menor (-1) no ganó: %', v_x; end if;
  -- La entrada armada trae las filas en ese orden.
  if (select jsonb_agg(f ->> 'v') from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a, jsonb_array_elements(a.entrada -> 'tablas' -> 't') f)
     <> '["9", "1", "2"]' then
    raise exception 'las filas de la entrada no vienen por orden, id';
  end if;
end $$;
rollback;

-- @test cotizacion_evaluar: la tabla congelada de la fórmula gana a la viva, aunque esté vacía, y la viva ni se lee
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare v_origen uuid; v_tabla uuid; v_vehiculo uuid; v_res jsonb; v_formula uuid;
begin
  insert into public.origenes (clave, nombre) values ('cot_eval_congelada', 'La congelada manda') returning id into v_origen;
  insert into public.formulas (origen_id, version, estado, definicion, params)
    values (v_origen, 1, 'publicada', pg_temp.formula_chica(), '{"c": 10, "tablas": {"t": [{"marca": "toyota", "v": 99}]}}') returning id into v_formula;
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'Congelada', 'toyota') returning id into v_vehiculo;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_origen, 't', 'T', '[]') returning id into v_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_tabla, '{"marca": "toyota", "v": 1}', 0);
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'x' <> '99' then raise exception 'con la congelada y la viva ganó %, y debía ganar la congelada (99)', v_res -> 'valores' -> 'x'; end if;
  if exists (select 1 from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a where a.entrada -> 'tablas' ? 't') then
    raise exception 'la entrada trae la tabla viva de una clave que la fórmula congeló';
  end if;
  -- Una congelada vacía manda igual: no hay filas, y no se cae a la viva.
  update public.formulas set params = '{"c": 10, "tablas": {"t": []}}' where id = v_formula;
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'x' <> 'null' or not (v_res -> 'faltantes' @> '[{"codigo": "tabla_sin_filas", "donde": "x"}]') then
    raise exception 'la congelada vacía no manda: %', v_res -> 'faltantes';
  end if;
  if exists (select 1 from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a where a.entrada -> 'tablas' ? 't') then
    raise exception 'la entrada trae la viva de una clave con la congelada vacía';
  end if;
end $$;
rollback;

-- @test cotizacion_evaluar: una cotización usa SU fórmula, SUS tipos de cambio y SU vehículo, no los vigentes
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_origen uuid; v_tabla uuid; v_vehiculo uuid; v_v1 uuid; v_cot uuid; v_cot_sin_tc uuid; v_cot_sin_vehiculo uuid;
  v_res jsonb; v_estado text; v_detalle text; v_pista text;
  v_def jsonb := pg_temp.formula_chica();
begin
  insert into public.origenes (clave, nombre) values ('cot_eval_vieja', 'La versión de la cotización') returning id into v_origen;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', v_def, '{"c": 10}') returning id into v_v1;
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'Vieja', 'toyota') returning id into v_vehiculo;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_origen, 't', 'T', '[]') returning id into v_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_tabla, '{"marca": "toyota", "v": 1}', 0);
  -- Tres cotizaciones de la versión 1: con su vehículo y su tipo de cambio congelado, con el tipo de cambio vacío y sin vehículo.
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base)
    values (v_origen, '00000000-0000-0000-0000-000000000001', v_v1, v_vehiculo, '{}', '{"oficial": 5}', '{}', 0) returning id into v_cot;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base)
    values (v_origen, '00000000-0000-0000-0000-000000000001', v_v1, v_vehiculo, '{}', '{}', '{}', 0) returning id into v_cot_sin_tc;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base)
    values (v_origen, '00000000-0000-0000-0000-000000000001', v_v1, null, '{}', '{"oficial": 5}', '{}', 0) returning id into v_cot_sin_vehiculo;
  -- Después se publica la versión 2: otra constante, y el tipo de cambio vigente cambia.
  update public.formulas set estado = 'archivada' where id = v_v1;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 2, 'publicada', v_def, '{"c": 20}');
  update public.tablas_referencia_filas set valores = '{"marca": "toyota", "v": 7}' where tabla_id = v_tabla;
  update public.tipos_cambio set valor = 7.5 where clave = 'oficial';

  -- La cotización vieja: su fórmula (c = 10), su tipo de cambio (5) y su vehículo (la tabla es la viva: v = 7).
  v_res := public.cotizacion_evaluar('{}', v_cot);
  if v_res -> 'valores' -> 'c' <> '10' then raise exception 'la cotización vieja usó la constante %, y era 10 (su versión)', v_res -> 'valores' -> 'c'; end if;
  if v_res -> 'valores' -> 'tc' <> '5' then raise exception 'la cotización usó el tipo de cambio %, y era el congelado (5)', v_res -> 'valores' -> 'tc'; end if;
  if v_res -> 'valores' -> 'x' <> '7' then raise exception 'la cotización no leyó la tabla de su vehículo: %', v_res -> 'valores' -> 'x'; end if;
  if v_res -> 'valores' -> 'total' <> '17' then raise exception 'el total de la cotización vieja es %, y era 17', v_res -> 'valores' -> 'total'; end if;
  -- El origen: la versión 2 (c = 20) y el tipo de cambio vigente (7,5).
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'c' <> '20' or v_res -> 'valores' -> 'tc' <> '7.5' then
    raise exception 'el origen no usó la publicada y el tipo de cambio vigente: c = %, tc = %', v_res -> 'valores' -> 'c', v_res -> 'valores' -> 'tc';
  end if;
  -- Un tipo de cambio que la cotización no congeló no se completa con el vigente.
  v_res := public.cotizacion_evaluar('{}', v_cot_sin_tc);
  if v_res -> 'valores' -> 'tc' <> 'null' or not (v_res -> 'faltantes' @> '[{"codigo": "tipo_de_cambio_sin_valor", "donde": "tc"}]') then
    raise exception 'la cotización sin tipo de cambio congelado usó otro: %', v_res -> 'valores' -> 'tc';
  end if;
  -- Sin vehículo no hay campo: la fórmula lo dice.
  v_res := public.cotizacion_evaluar('{}', v_cot_sin_vehiculo);
  if not (v_res -> 'faltantes' @> '[{"codigo": "campo_sin_valor", "donde": "x"}]') then
    raise exception 'una cotización sin vehículo no anotó el campo sin valor: %', v_res -> 'faltantes';
  end if;
  -- A una cotización no se le pasa otro vehículo.
  begin
    perform public.cotizacion_evaluar('{}', v_cot, null, v_vehiculo);
    raise exception 'dejó pasar un vehículo con una cotización';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
    if v_detalle <> 'llamada_invalida' or v_pista <> 'p_vehiculo' then raise exception 'otro error: % / %', v_detalle, v_pista; end if;
  end;
end $$;
rollback;

-- @test cotizacion_evaluar: la tabla del origen gana a la compartida, una inactiva no existe, y no se lee la de otro origen ni la que ningún nodo nombra
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_origen uuid; v_otro uuid; v_propia uuid; v_comun uuid; v_ajena uuid; v_vehiculo uuid; v_res jsonb; v_claves text[];
begin
  insert into public.origenes (clave, nombre) values ('cot_eval_tablas', 'Resolución de tablas') returning id into v_origen;
  insert into public.origenes (clave, nombre) values ('cot_eval_tablas_otro', 'Otro origen') returning id into v_otro;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', pg_temp.formula_chica(), '{"c": 10}');
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'Tablas', 'toyota') returning id into v_vehiculo;
  -- Una de otro origen con la misma clave, una compartida, la propia (inactiva) y una que ningún nodo nombra.
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_otro, 't', 'Ajena', '[]') returning id into v_ajena;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (null, 't', 'Compartida', '[]') returning id into v_comun;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas, activa) values (v_origen, 't', 'Propia', '[]', false) returning id into v_propia;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_origen, 'zz', 'Nadie la nombra', '[]');
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_ajena, '{"marca": "toyota", "v": 77}', 0);
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_comun, '{"marca": "toyota", "v": 7}', 0);
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_propia, '{"marca": "toyota", "v": 1}', 0);
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) select id, '{"marca": "toyota", "v": 1000}', 0 from public.tablas_referencia where clave = 'zz' and origen_id = v_origen;
  -- Con la propia inactiva se usa la compartida (7), no la ajena (77).
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'x' <> '7' then raise exception 'con la propia inactiva ganó %, y debía ganar la compartida (7)', v_res -> 'valores' -> 'x'; end if;
  -- Activa, la propia gana a la compartida; sus filas inactivas no cuentan.
  update public.tablas_referencia set activa = true where id = v_propia;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden, activa) values (v_propia, '{"marca": "toyota", "v": 50}', -1, false);
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'x' <> '1' then raise exception 'la propia no ganó a la compartida, o leyó una fila inactiva: %', v_res -> 'valores' -> 'x'; end if;
  -- Ninguna otra tabla llega a la entrada: ni la ajena, ni la compartida con la propia activa, ni la que ningún nodo nombra.
  select array_agg(k order by k) into v_claves from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a, jsonb_object_keys(a.entrada -> 'tablas') k;
  if v_claves <> array['t'] then raise exception 'la entrada trae tablas que no debía: %', v_claves; end if;
  -- Sin la propia ni la compartida, la de otro origen no se usa: «tabla sin filas».
  delete from public.tablas_referencia where id in (v_propia, v_comun);
  v_res := public.cotizacion_evaluar('{}', null, v_origen, v_vehiculo);
  if v_res -> 'valores' -> 'x' <> 'null' or not (v_res -> 'faltantes' @> '[{"codigo": "tabla_sin_filas", "donde": "x"}]') then
    raise exception 'sin tabla propia ni compartida se usó la de otro origen: %', v_res -> 'valores' -> 'x';
  end if;
  -- Una tabla activa sin filas activas es una tabla vacía.
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_origen, 't', 'Vacía', '[]') returning id into v_propia;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden, activa) values (v_propia, '{"marca": "toyota", "v": 1}', 0, false);
  if (select a.entrada -> 'tablas' -> 't' from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a) <> '[]' then
    raise exception 'una tabla sin filas activas debía llegar vacía';
  end if;
end $$;
rollback;

-- @test cotizacion_evaluar: del vehículo sólo llegan los campos que la fórmula nombra, y sólo los que la base reconoce
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_origen uuid; v_vehiculo uuid; v_veh jsonb; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cot_eval_campos', 'Campos del vehículo') returning id into v_origen;
  v_def := '{"nodos": [
    {"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
    {"id": "anio", "tipo": "campo_vehiculo", "campo": "anio", "etiqueta": "Año", "formato": "raw"},
    {"id": "precio", "tipo": "campo_vehiculo", "campo": "precio", "etiqueta": "Precio", "formato": "usd"},
    {"id": "cilindrada", "tipo": "campo_vehiculo", "campo": "cilindrada", "etiqueta": "Cilindrada", "formato": "raw"},
    {"id": "nota", "tipo": "campo_vehiculo", "campo": "nota", "etiqueta": "Nota", "formato": "raw"},
    {"id": "listo", "tipo": "campo_vehiculo", "campo": "listo", "etiqueta": "Listo", "formato": "raw"},
    {"id": "fantasma", "tipo": "campo_vehiculo", "campo": "fantasma", "etiqueta": "Fantasma", "formato": "raw"},
    {"id": "apagado", "tipo": "campo_vehiculo", "campo": "apagado", "etiqueta": "Apagado", "formato": "raw"},
    {"id": "punto", "tipo": "campo_vehiculo", "campo": "atributos.cilindrada", "etiqueta": "Con punto", "formato": "raw"},
    {"id": "marca", "tipo": "campo_vehiculo", "campo": "marca", "etiqueta": "Marca", "formato": "raw"},
    {"id": "t", "tipo": "tabla", "tabla": "t", "match": {"color": "color", "modelo": "modelo"}, "columna": "v", "etiqueta": "T", "formato": "usd"},
    {"id": "total", "tipo": "calculo", "op": "suma", "de": ["t"], "etiqueta": "Total", "formato": "usd", "salida": "total", "bucket": "b"}
  ], "buckets": {"b": "tc"}}';
  -- `validar_formula()` rechaza el campo con punto (`campo_con_punto`, 4-3): se valida con la clave sin punto y se guarda con el punto,
  -- porque lo que se comprueba es que `_cotizacion_armar()` no lo lea aunque una fórmula vieja lo traiga.
  perform public.validar_formula(replace(v_def::text, '"atributos.cilindrada"', '"con_punto"')::jsonb, '{}');
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', v_def, '{}');
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values
    (v_origen, 'cilindrada', 'Cilindrada', 'numero'), (v_origen, 'nota', 'Nota', 'texto'), (v_origen, 'listo', 'Listo', 'booleano');
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, activo) values (v_origen, 'apagado', 'Apagado', 'numero', false)
    on conflict (origen_id, clave) do nothing;
  insert into public.vehiculos (origen_id, titulo, anio, precio, atributos)
    values (v_origen, 'Campos', 2021, 1234.5,
            jsonb_build_object('cilindrada', 2.5, 'nota', repeat('x', 201), 'listo', true, 'fantasma', 5, 'apagado', 3, 'color', 'rojo',
                               'atributos.cilindrada', 9))
    returning id into v_vehiculo;
  select a.entrada -> 'vehiculo' into v_veh from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a;
  -- Llegan: la columna anio y el precio, la cilindrada (número de un campo del origen) y el color, que un `match` nombra. No llegan:
  -- el texto de 201 letras, el booleano, el campo que el origen no declara, el apagado, el nombre con punto, la marca vacía y el modelo.
  if v_veh <> '{"anio": 2021, "precio": 1234.5, "cilindrada": 2.5, "color": "rojo"}'::jsonb then
    raise exception 'el vehículo armado es %', v_veh;
  end if;
  -- Un texto de 200 letras sí llega.
  update public.vehiculos set atributos = atributos || jsonb_build_object('nota', repeat('x', 200)) where id = v_vehiculo;
  if char_length((select a.entrada -> 'vehiculo' ->> 'nota' from public._cotizacion_armar('{}', null, v_origen, v_vehiculo) a)) <> 200 then
    raise exception 'un texto de 200 letras no llegó';
  end if;
  -- Sin vehículo, la entrada trae el objeto vacío.
  if (select a.entrada -> 'vehiculo' from public._cotizacion_armar('{}', null, v_origen, null) a) <> '{}'::jsonb then
    raise exception 'sin vehículo debía llegar {}';
  end if;
end $$;
rollback;

-- @test cotizacion_evaluar: hasta el 4.10 authenticated no la ejecuta; con el permiso, cada quien ve lo que la policy le deja ver
begin;
do $$
declare
  v_fn text[] := array['public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb)', 'public._cotizacion_armar(jsonb, uuid, uuid, uuid)'];
  f text;
begin
  foreach f in array v_fn loop
    if has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') then
      raise exception '% la ejecuta authenticated o anon: hasta el 4.10 devuelve el resultado entero, sin recorte por nivel', f;
    end if;
    if exists (select 1 from aclexplode(coalesce((select proacl from pg_proc where oid = f::regprocedure),
                                                  acldefault('f', (select proowner from pg_proc where oid = f::regprocedure)))) a
                where a.grantee = 0) then
      raise exception '% la ejecuta PUBLIC', f;
    end if;
  end loop;
end $$;

-- Lo que devuelve una llamada: 'ok' o 'código de error | detalle | pista'.
create or replace function pg_temp.llamar(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_detalle text; v_pista text; v_mensaje text;
begin
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail, v_pista = pg_exception_hint, v_mensaje = message_text;
  return v_estado || '|' || coalesce(v_detalle, '') || '|' || coalesce(v_pista, '') || '|' || v_mensaje;
end $$;
grant execute on function pg_temp.llamar(text) to authenticated;

do $$
declare
  v_origen uuid; v_otro uuid; v_sin_formula uuid; v_vehiculo uuid; v_ajeno uuid; v_papelera uuid; v_formula uuid; v_cot uuid;
  v_cot_bloqueada uuid; v_base text; v_r text;
begin
  -- Dos personas activas: una asesora (cotizaciones.crear «todos», cotizaciones.ver «propios», vehiculos.ver «todos») y una de logística
  -- (vehiculos.ver, sin cotizaciones.crear). Las del humo ya no están todas activas.
  insert into auth.users (id, email, raw_app_meta_data) values
    ('00000000-0000-0000-0000-0000000004a1', 'cot-eval-asesora@ejemplo.com', '{"invitado": true}'),
    ('00000000-0000-0000-0000-0000000004a2', 'cot-eval-logistica@ejemplo.com', '{"invitado": true}'),
    ('00000000-0000-0000-0000-0000000004a3', 'cot-eval-bloqueada@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id) values
    ('00000000-0000-0000-0000-0000000004a1', (select id from public.roles where clave = 'asesor')),
    ('00000000-0000-0000-0000-0000000004a2', (select id from public.roles where clave = 'logistica')),
    ('00000000-0000-0000-0000-0000000004a3', (select id from public.roles where clave = 'asesor'));
  insert into public.origenes (clave, nombre) values ('cot_eval_permisos', 'Permisos') returning id into v_origen;
  insert into public.origenes (clave, nombre) values ('cot_eval_permisos_otro', 'Otro') returning id into v_otro;
  insert into public.origenes (clave, nombre) values ('cot_eval_sin_formula', 'Sin fórmula') returning id into v_sin_formula;
  insert into public.formulas (origen_id, version, estado, definicion, params) values (v_origen, 1, 'publicada', pg_temp.formula_chica(), '{"c": 10}') returning id into v_formula;
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'Visible', 'toyota') returning id into v_vehiculo;
  insert into public.vehiculos (origen_id, titulo, marca) values (v_otro, 'De otro origen', 'toyota') returning id into v_ajeno;
  insert into public.vehiculos (origen_id, titulo, marca) values (v_origen, 'En la papelera', 'toyota') returning id into v_papelera;
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  -- Una cotización de la dueña, sin lead: la asesora (cotizaciones.ver «propios») no la ve.
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base)
    values (v_origen, '00000000-0000-0000-0000-000000000001', v_formula, v_vehiculo, '{}', '{"oficial": 5}', '{}', 0) returning id into v_cot;
  -- Una cotización de la persona bloqueada (con sus permisos de asesora, ella la vería si no estuviera bloqueada).
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base)
    values (v_origen, '00000000-0000-0000-0000-0000000004a3', v_formula, '{}', '{"oficial": 5}', '{}', 0) returning id into v_cot_bloqueada;
  update public.perfiles set bloqueado = true where id = '00000000-0000-0000-0000-0000000004a3';
  grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) to authenticated;
  set local role authenticated;

  -- La dueña: todo.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, v_vehiculo));
  if v_r <> 'ok' then raise exception 'la dueña no puede evaluar un origen: %', v_r; end if;
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, %L)', '{}', v_cot));
  if v_r <> 'ok' then raise exception 'la dueña no puede evaluar su cotización: %', v_r; end if;

  -- La asesora.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000004a1', true);
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, v_vehiculo));
  if v_r <> 'ok' then raise exception 'la asesora no puede evaluar un origen: %', v_r; end if;
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, %L)', '{}', v_cot));
  if v_r not like '42501|%|No tienes acceso a esta cotización.' then raise exception 'una cotización ajena: %', v_r; end if;
  -- Una que no existe da lo mismo: no se enumera.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, %L)', '{}', gen_random_uuid()));
  if v_r not like '42501|%|No tienes acceso a esta cotización.' then raise exception 'una cotización inexistente: %', v_r; end if;
  -- El vehículo en la papelera no lo ve nadie.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, v_papelera));
  if v_r not like '42501|%|No tienes acceso a este vehículo.' then raise exception 'un vehículo en la papelera: %', v_r; end if;
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, gen_random_uuid()));
  if v_r not like '42501|%|No tienes acceso a este vehículo.' then raise exception 'un vehículo inexistente: %', v_r; end if;
  -- Un vehículo de otro origen.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, v_ajeno));
  if v_r not like '22023|vehiculo_de_otro_origen|p_vehiculo|%' then raise exception 'un vehículo de otro origen: %', v_r; end if;
  -- Un origen sin fórmula publicada.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L)', '{}', v_sin_formula));
  if v_r not like '22023|origen_sin_formula||%' then raise exception 'un origen sin fórmula: %', v_r; end if;
  -- La llamada: una cotización y un origen, ninguno, o un vehículo con una cotización.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, %L, %L)', '{}', v_cot, v_origen));
  if v_r not like '22023|llamada_invalida||%' then raise exception 'los dos: %', v_r; end if;
  v_r := pg_temp.llamar('select public.cotizacion_evaluar(''{}'')');
  if v_r not like '22023|llamada_invalida||%' then raise exception 'ninguno: %', v_r; end if;
  -- Las entradas: un objeto con sólo lo que la persona tipea. Lo que pone la base no se acepta.
  foreach v_base in array array['tipos_cambio', 'vehiculo', 'tablas', 'zz'] loop
    v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L)', jsonb_build_object(v_base, '{}'::jsonb), v_origen));
    if v_r not like format('22023|entradas_invalidas|%s|%%', v_base) then raise exception 'las entradas con «%»: %', v_base, v_r; end if;
  end loop;
  foreach v_base in array array['null', '[]', '1', '"x"'] loop
    v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L::jsonb, null, %L)', v_base, v_origen));
    if v_r not like '22023|entradas_invalidas||%' then raise exception 'las entradas %: %', v_base, v_r; end if;
  end loop;
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(null, null, %L)', v_origen));
  if v_r not like '22023|entradas_invalidas||%' then raise exception 'las entradas nulas: %', v_r; end if;
  -- Lo de la persona se revisa como evaluar_formula(): un input que no es un número.
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"c": "x"}}', v_origen));
  if v_r not like '22023|entrada_invalida|inputs|%' then raise exception 'un input mal formado: %', v_r; end if;

  -- Una persona bloqueada no evalúa nada, ni una cotización suya.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000004a3', true);
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, %L)', '{}', v_cot_bloqueada));
  if v_r not like '42501|%|Tu cuenta está bloqueada o dada de baja.' then raise exception 'una persona bloqueada: %', v_r; end if;
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L)', '{}', v_origen));
  if v_r not like '42501|%|Tu cuenta está bloqueada o dada de baja.' then raise exception 'una persona bloqueada, por origen: %', v_r; end if;
  -- Logística no tiene cotizaciones.crear.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000004a2', true);
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L, %L)', '{}', v_origen, v_vehiculo));
  if v_r not like '42501|%' then raise exception 'sin cotizaciones.crear: %', v_r; end if;
  -- Y el armado no es de nadie: ni con el permiso de la otra.
  v_r := pg_temp.llamar(format('select * from public._cotizacion_armar(%L, null, %L, null)', '{}', v_origen));
  if v_r not like '42501|%' then raise exception '_cotizacion_armar lo ejecuta authenticated: %', v_r; end if;
  -- Sin sesión, ni el permiso temporal alcanza.
  perform set_config('request.jwt.claim.sub', '', true);
  v_r := pg_temp.llamar(format('select public.cotizacion_evaluar(%L, null, %L)', '{}', v_origen));
  if v_r not like '42501|%' then raise exception 'sin sesión: %', v_r; end if;
  reset role;
end $$;
rollback;
