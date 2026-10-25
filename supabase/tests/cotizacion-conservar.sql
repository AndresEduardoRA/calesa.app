-- Lo que se reconstruye de lo guardado (paso 4.10, prompt 3; D7: «guardar conserva lo que quien guarda no ve»): `_cotizacion_entradas_de()` (valores y fuentes guardados a lo que la persona tipeó) y
-- `_cotizacion_conservar()` (lo que no se edita sale de lo guardado, y un valor distinto para un nodo que se ve y no se edita es un error). Puras: no necesitan personas ni cotizaciones.
-- `pg_temp.iguales()` es la de `evaluar-formula.sql`, que corre antes; el corpus del motor lo carga `scripts/probar-schema.mjs` en `_corpus_del_motor`.

-- @test conservar: lo guardado vuelve a lo que la persona tipeó, y lo derivado no
do $$
declare
  v_def constant jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'i_tipeado', 'tipo', 'input'), jsonb_build_object('id', 'i_vacio', 'tipo', 'input'), jsonb_build_object('id', 'i_req', 'tipo', 'input', 'requerido_si', 'b_on'),
    jsonb_build_object('id', 'i_sug', 'tipo', 'input', 'sugerido_de', 'i_tipeado'), jsonb_build_object('id', 'i_sugerido', 'tipo', 'input', 'sugerido_de', 'i_tipeado'),
    jsonb_build_object('id', 'c_def', 'tipo', 'constante'), jsonb_build_object('id', 'c_ov', 'tipo', 'constante'),
    jsonb_build_object('id', 'tc_def', 'tipo', 'tipo_cambio', 'clave', 'oficial'), jsonb_build_object('id', 'tc_ov', 'tipo', 'tipo_cambio', 'clave', 'paralelo'),
    jsonb_build_object('id', 't_sug', 'tipo', 'tabla', 'sobrescribible', true), jsonb_build_object('id', 't_ov', 'tipo', 'tabla', 'sobrescribible', true),
    jsonb_build_object('id', 'calc', 'tipo', 'calculo', 'op', 'suma'), jsonb_build_object('id', 'calc_ov', 'tipo', 'calculo', 'op', 'suma', 'sobrescribible', true),
    jsonb_build_object('id', 'monto', 'tipo', 'calculo', 'op', 'porcentaje_de', 'sobrescribible', true, 'pct', 'pct'), jsonb_build_object('id', 'pct', 'tipo', 'input'),
    jsonb_build_object('id', 'monto2', 'tipo', 'calculo', 'op', 'porcentaje_de', 'sobrescribible', true, 'pct', 'pct2'), jsonb_build_object('id', 'pct2', 'tipo', 'input'),
    jsonb_build_object('id', 'b_on', 'tipo', 'bandera'), jsonb_build_object('id', 'b_off', 'tipo', 'bandera'),
    jsonb_build_object('id', 'op', 'tipo', 'opcion'), jsonb_build_object('id', 'inactivo', 'tipo', 'input'), jsonb_build_object('id', 'cv', 'tipo', 'campo_vehiculo', 'campo', 'marca')));
  v_valores constant jsonb := '{"i_tipeado": 10, "i_vacio": 0, "i_req": null, "i_sug": 3, "i_sugerido": 10, "c_def": 5, "c_ov": 7, "tc_def": 6.96, "tc_ov": null, "t_sug": 4, "t_ov": 9, "calc": 11, "calc_ov": 12,
    "monto": 100, "pct": 0.1, "monto2": 50, "pct2": 0.5, "b_on": 1, "b_off": 0, "op": "a", "inactivo": 0, "cv": "toyota"}';
  v_fuentes constant jsonb := '{"i_tipeado": "input", "i_vacio": "input", "i_req": "input", "i_sug": "override", "i_sugerido": "sugerido", "c_def": "default", "c_ov": "override", "tc_def": "default", "tc_ov": "override",
    "t_sug": "sugerido", "t_ov": "override", "calc_ov": "override", "monto": "override", "pct": "override", "monto2": "sugerido", "pct2": "input"}';
  r jsonb;
begin
  r := public._cotizacion_entradas_de(v_def, v_valores, v_fuentes);
  -- Lo tipeado: un input (también el 0 sin tipear: es lo mismo para el motor), el que tipeó con sugerido_de; no el requerido sin valor, ni el sugerido, ni el pct pisado, ni lo apagado.
  if r -> 'inputs' is distinct from '{"i_tipeado": 10, "i_vacio": 0, "i_sug": 3, "pct2": 0.5}'::jsonb then raise exception 'los inputs: %', r -> 'inputs'; end if;
  -- Los overrides: de constantes, tipos de cambio, tablas y cálculos sobrescribibles; el tipo de cambio sin valor con override vale 0 («≤ 0 es sin valor»); el monto que manda.
  if r -> 'overrides' is distinct from '{"c_ov": 7, "tc_ov": 0, "t_ov": 9, "calc_ov": 12, "monto": 100}'::jsonb then raise exception 'los overrides: %', r -> 'overrides'; end if;
  -- Las banderas son booleanos (la entrada los pide así) y la variante, su clave.
  if r -> 'banderas' is distinct from '{"b_on": true, "b_off": false}'::jsonb or r -> 'variante' is distinct from '"a"'::jsonb then raise exception 'banderas o variante: %', r; end if;
end $$;

-- @test conservar: lo que quien llama no edita sale de lo guardado, lo que edita es lo que manda, y un valor distinto para un nodo que ve y no edita es nodo_no_editable
do $$
declare
  v_def constant jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'libre', 'tipo', 'input'), jsonb_build_object('id', 'fijo', 'tipo', 'input'), jsonb_build_object('id', 'oculto', 'tipo', 'input'),
    jsonb_build_object('id', 'oculto2', 'tipo', 'constante'), jsonb_build_object('id', 'b_ocu', 'tipo', 'bandera'), jsonb_build_object('id', 'b_libre', 'tipo', 'bandera'),
    jsonb_build_object('id', 'op', 'tipo', 'opcion')));
  v_guardado constant jsonb := jsonb_build_object(
    'valores', '{"libre": 1, "fijo": 5, "oculto": 25, "oculto2": 8, "b_ocu": 1, "b_libre": 1, "op": "b"}'::jsonb,
    'fuentes', '{"libre": "input", "fijo": "input", "oculto": "input", "oculto2": "override"}'::jsonb);
  v_edita constant jsonb := '{"libre": true, "b_libre": true}';
  v_entrada constant jsonb := '{"inputs": {}, "banderas": {}, "overrides": {}, "tipos_cambio": {"oficial": 6.96}, "vehiculo": {}, "tablas": {}}';
  r jsonb; v_e text; v_d text; v_h text;
begin
  -- Sin mandar nada: lo que no edita, de lo guardado (lo oculto, lo visible no editable y la variante); lo que edita, sin tipear; lo demás de la entrada (tarifas, vehículo, tablas) intacto.
  r := public._cotizacion_conservar(v_def, v_entrada, v_edita, v_guardado);
  if r -> 'inputs' is distinct from '{"fijo": 5, "oculto": 25}'::jsonb or r -> 'overrides' is distinct from '{"oculto2": 8}'::jsonb or r -> 'banderas' is distinct from '{"b_ocu": true}'::jsonb
     or r -> 'variante' is distinct from '"b"'::jsonb or r -> 'tipos_cambio' is distinct from '{"oficial": 6.96}'::jsonb then
    raise exception 'sin mandar nada: %', r;
  end if;
  -- Lo que manda de lo que edita entra; lo que manda de lo que no edita, igual a lo guardado, no es un cambio.
  r := public._cotizacion_conservar(v_def, jsonb_set(v_entrada, '{inputs}', '{"libre": 9, "fijo": 5}'), v_edita, v_guardado);
  if r -> 'inputs' is distinct from '{"libre": 9, "fijo": 5, "oculto": 25}'::jsonb then raise exception 'lo que edita: %', r -> 'inputs'; end if;
  r := public._cotizacion_conservar(v_def, jsonb_set(v_entrada, '{banderas}', '{"b_libre": false}'), v_edita, v_guardado);
  if r -> 'banderas' is distinct from '{"b_ocu": true, "b_libre": false}'::jsonb then raise exception 'la bandera que edita: %', r -> 'banderas'; end if;
  -- Un valor distinto para un nodo que se ve y no se edita (un input, una bandera, un override o la variante): 42501 nodo_no_editable, con el primero por id en bytes.
  foreach v_h in array array['fijo', 'oculto2', 'b_ocu', 'op'] loop
    begin
      perform public._cotizacion_conservar(v_def, case v_h
        when 'fijo' then jsonb_set(v_entrada, '{inputs}', '{"fijo": 6}') when 'oculto2' then jsonb_set(v_entrada, '{overrides}', '{"oculto2": 9}')
        when 'b_ocu' then jsonb_set(v_entrada, '{banderas}', '{"b_ocu": false}') else v_entrada || '{"variante": "a"}' end, v_edita, v_guardado);
      raise exception 'un valor distinto para % debía rechazarse', v_h;
    exception when sqlstate '42501' then
      get stacked diagnostics v_d = pg_exception_detail, v_e = pg_exception_hint;
      if v_d is distinct from 'nodo_no_editable' or v_e is distinct from v_h then raise exception 'el error de %: % %', v_h, v_d, v_e; end if;
    end;
  end loop;
  begin
    perform public._cotizacion_conservar(v_def, jsonb_set(jsonb_set(v_entrada, '{inputs}', '{"fijo": 6}'), '{banderas}', '{"b_ocu": false}'), v_edita, v_guardado);
    raise exception 'dos nodos no editables debían rechazarse';
  exception when sqlstate '42501' then
    get stacked diagnostics v_e = pg_exception_hint;
    if v_e is distinct from 'b_ocu' then raise exception 'el primero por id en bytes era b_ocu y es %', v_e; end if;
  end;
  -- La variante: la que edita y manda entra; sin mandar, la guardada (no tiene «sin tipear»).
  r := public._cotizacion_conservar(v_def, v_entrada || '{"variante": "a"}', v_edita || '{"op": true}', v_guardado);
  if r -> 'variante' is distinct from '"a"'::jsonb then raise exception 'la variante que edita: %', r; end if;
  r := public._cotizacion_conservar(v_def, v_entrada, v_edita || '{"op": true}', v_guardado);
  if r -> 'variante' is distinct from '"b"'::jsonb then raise exception 'sin mandar la variante que edita: %', r; end if;
  -- Una fórmula sin opción: una variante mandada no se toca (ya la rechazó _cotizacion_tipeado).
  r := public._cotizacion_conservar(jsonb_build_object('nodos', '[]'::jsonb), v_entrada, '{}', jsonb_build_object('valores', '{}'::jsonb, 'fuentes', '{}'::jsonb));
  if r ? 'variante' then raise exception 'inventó una variante: %', r; end if;
  -- Lo guardado vacío (una cotización sin snapshot) no rompe nada.
  r := public._cotizacion_conservar(v_def, v_entrada, v_edita, jsonb_build_object('valores', '{}'::jsonb, 'fuentes', '{}'::jsonb));
  if r -> 'inputs' <> '{}'::jsonb then raise exception 'lo guardado vacío: %', r; end if;
end $$;

-- @test conservar: evaluar(reconstruir(evaluar(E))) = evaluar(E) en cada caso con resultado del juego y del corpus del motor (valores, estados, fuentes, totales y faltantes)
do $$
declare
  c record; v_def jsonb; v_par jsonb; v_ent jsonb; v_modo jsonb; v_res jsonb; v_res2 jsonb; v_r jsonb; v_ent2 jsonb; k text;
  v_n int := 0; v_malos text[] := '{}';
begin
  for c in select x.value as caso, x.formulas -> (x.value ->> 'formula') as formula
             from (select e.value, d.doc -> 'formulas' as formulas from _corpus_del_motor d cross join lateral jsonb_array_elements(d.doc -> 'juego') e
                   union all
                   select e.value, d.doc -> 'formulas' from _corpus_del_motor d cross join lateral jsonb_array_elements(d.doc -> 'casos') e) x loop
    continue when not (c.caso -> 'esperado') ? 'resultado' or c.caso ? 'texto';
    v_def := c.formula -> 'definicion'; v_par := c.formula -> 'params'; v_ent := c.caso -> 'entrada'; v_modo := c.caso -> 'modo';
    v_res := public.evaluar_formula(v_def, v_par, v_ent, v_modo);
    v_r := public._cotizacion_entradas_de(v_def, v_res -> 'valores', v_res -> 'fuentes');
    v_ent2 := (v_ent - 'inputs' - 'banderas' - 'overrides' - 'variante') || jsonb_build_object('inputs', v_r -> 'inputs', 'banderas', v_r -> 'banderas', 'overrides', v_r -> 'overrides')
              || case when v_r ? 'variante' then jsonb_build_object('variante', v_r -> 'variante') else '{}'::jsonb end;
    v_res2 := public.evaluar_formula(v_def, v_par, v_ent2, v_modo);
    v_n := v_n + 1;
    foreach k in array array['valores', 'estados', 'fuentes', 'totales', 'faltantes'] loop
      if not pg_temp.iguales(v_res -> k, v_res2 -> k) then v_malos := v_malos || format('%s (%s)', c.caso ->> 'nombre', k); exit; end if;
    end loop;
  end loop;
  if v_n < 300 then raise exception 'sólo % casos con resultado: ¿se cargó el corpus?', v_n; end if;
  if cardinality(v_malos) > 0 then raise exception '% de % casos no se reconstruyen:%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos[1:15], E'\n  '); end if;
end $$;
