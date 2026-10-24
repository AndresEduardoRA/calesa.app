-- La regla `campo_con_punto` de validar_formula() (paso 4.07, prompt 2; docs/PLAN.md 4-3; espejo de `validar-campos.ts`).
--
-- Un `campo` de un nodo `campo_vehiculo` (o un valor de un `match` que no nombra un nodo) es una columna directa del vehículo o la
-- clave de un campo del origen, y una clave no lleva puntos (`origenes_campos.clave`): `cotizacion_evaluar()` nunca lee
-- `atributos.cilindrada`. El patrón de la forma admite puntos (el Zod de `nodos.ts` también), así que una fórmula con uno validaba y su
-- nodo daba siempre `campo_sin_valor`. Ahora se rechaza con su propia regla, la última del orden (después de la variante), y `donde`
-- es el id del nodo: el orden de las claves de un `match` (jsonb contra inserción) no cambia el resultado.
--
-- `validar_formula()` se redefine ENTERA (…004900 ya está commiteada y no se edita; docs/DECISIONES.md, 2026-10-15): el cuerpo es el
-- de …004900 más el `perform` final, y sigue STABLE como la dejó …005100 (con IMMUTABLE se deshace esa migración).

create or replace function public._formula_campos(p_nodos jsonb, p_tipos text[])
returns void language plpgsql stable set search_path = '' as $$
declare
  v_id text;
  v_campo text;
begin
  for i in 1 .. jsonb_array_length(p_nodos) loop
    v_id := p_nodos -> (i - 1) ->> 'id';
    v_campo := null;
    if p_tipos[i] = 'campo_vehiculo' then
      v_campo := p_nodos -> (i - 1) ->> 'campo';
      if strpos(v_campo, '.') = 0 then v_campo := null; end if;
    elsif p_tipos[i] = 'tabla' then
      -- Un valor del `match` con punto no puede ser un nodo (un id no lleva puntos): nombra un campo del vehículo.
      select m.value #>> '{}' into v_campo
        from jsonb_each(p_nodos -> (i - 1) -> 'match') m
       where strpos(m.value #>> '{}', '.') > 0
       limit 1;
    end if;
    if v_campo is not null then
      perform public._formula_rechazar('campo_con_punto', v_id,
        format('«%s» nombra el campo «%s»: un campo del vehículo es una columna o la clave de un campo del origen, sin puntos (escribe, por ejemplo, «cilindrada»).', v_id, v_campo));
    end if;
  end loop;
end;
$$;

create or replace function public.validar_formula(p_def jsonb, p_params jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb;
  v_n int;
  v_pos jsonb;            -- id → posición (1..n); con un id repetido, la última, como el `pos.set` de TS
  v_ids text[];
  v_tipos text[];
  v_formatos text[];      -- `formato`, o `usd` si no lo trae
  v_sobres boolean[];     -- `sobrescribible: true`
  v_constantes jsonb;     -- el conjunto de ids de los nodos `constante`
  v_total int;            -- el primer nodo con `salida: total`
  v_totales int;
  v_nodo jsonb;
  v_x jsonb;
  v_id text;
  v_tipo text;
  v_ref text;
  v_papel text;
  v_otro text;
  v_refs text[];
  v_papeles text[];
  v_lectores_ref text[] := '{}';   -- cada arista (quien lee → qué lee), en el orden de los nodos y de sus referencias
  v_lectores_de text[] := '{}';
  v_lectores jsonb;                -- id leído → [primer lector, otro lector distinto]
  v_mal boolean;
  i int;
  j int;
  k int;
begin
  -- §0 la forma.
  perform public._formula_forma(p_def, p_params);
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);

  -- §1 el índice (indexar): un id, un solo nodo.
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(coalesce(x.value ->> 'formato', 'usd') order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'id', true) filter (where x.value ->> 'tipo' = 'constante'), '{}'::jsonb),
         coalesce(sum(case when x.value ->> 'salida' = 'total' then 1 else 0 end), 0),
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_pos, v_ids, v_tipos, v_formatos, v_sobres, v_constantes, v_totales, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  select d.id into v_id
    from (select x.value ->> 'id' as id, x.pos, min(x.pos) over (partition by x.value ->> 'id') as primera
            from jsonb_array_elements(v_nodos) with ordinality as x(value, pos)) d
   where d.pos > d.primera
   order by d.pos
   limit 1;
  if v_id is not null then
    perform public._formula_rechazar('nodo_duplicado', v_id, format('Hay dos nodos con el id «%s».', v_id));
  end if;

  -- §2 las referencias (revisarReferencias): existen, van hacia atrás y nombran el tipo que corresponde. En el orden de
  -- `referenciasDe()`. De paso se anotan las aristas, que §5 usa para saber quién lee cada nodo.
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_refs := '{}';
    v_papeles := '{}';
    if v_tipo = 'input' then
      if v_nodo ? 'sugerido_de' then v_refs := array_append(v_refs, v_nodo ->> 'sugerido_de'); v_papeles := array_append(v_papeles, 'sugerido_de'); end if;
      if v_nodo ? 'requerido_si' then v_refs := array_append(v_refs, v_nodo ->> 'requerido_si'); v_papeles := array_append(v_papeles, 'requerido_si'); end if;
    elsif v_tipo = 'tabla' then
      -- Los valores de `match`, en el orden de sus claves en jsonb.
      for v_ref in select m.value from jsonb_each_text(v_nodo -> 'match') m loop
        v_refs := array_append(v_refs, v_ref);
        v_papeles := array_append(v_papeles, 'match');
      end loop;
    elsif v_tipo = 'tramo' then
      v_refs := array_append(v_refs, v_nodo ->> 'sobre');
      v_papeles := array_append(v_papeles, 'sobre');
    elsif v_tipo = 'calculo' then
      v_x := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_x) - 1 loop
        v_refs := array_append(v_refs, v_x ->> k);
        v_papeles := array_append(v_papeles, 'de');
      end loop;
      if v_nodo ->> 'op' = 'porcentaje_de' then v_refs := array_append(v_refs, v_nodo ->> 'pct'); v_papeles := array_append(v_papeles, 'pct'); end if;
      if v_nodo ->> 'op' = 'depreciar' then v_refs := array_append(v_refs, v_nodo ->> 'sobre'); v_papeles := array_append(v_papeles, 'sobre'); end if;
    end if;
    -- `condicion` va al final en los tipos que la admiten (la forma ya sacó a los demás).
    if v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      v_refs := array_append(v_refs, v_nodo ->> 'condicion');
      v_papeles := array_append(v_papeles, 'condicion');
    end if;

    for k in 1 .. coalesce(array_length(v_refs, 1), 0) loop
      v_ref := v_refs[k];
      v_papel := v_papeles[k];
      v_lectores_ref := array_append(v_lectores_ref, v_ref);
      v_lectores_de := array_append(v_lectores_de, v_id);
      j := (v_pos ->> v_ref)::int;
      if j is null then
        -- Un `match` que no nombra un nodo nombra un campo del vehículo.
        continue when v_papel = 'match';
        perform public._formula_rechazar('referencia_inexistente', v_id,
          format('«%s» usa «%s», que no es un nodo de la fórmula.', v_id, v_ref));
        continue;
      end if;
      if j = i then
        perform public._formula_rechazar('ciclo', v_id, format('«%s» se usa a sí mismo: sería un ciclo.', v_id));
      end if;
      if j > i then
        perform public._formula_rechazar('referencia_hacia_adelante', v_id,
          format('«%s» usa «%s», que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.', v_id, v_ref));
      end if;
      if v_papel in ('condicion', 'requerido_si') and v_tipos[j] <> 'bandera' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel, 'una bandera'));
      end if;
      if v_tipos[j] = 'opcion' and v_papel <> 'match' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel,
                 'un número (la variante se nombra en «solo_en» o en un «match»)'));
      end if;
    end loop;
  end loop;

  -- §3 el total (revisarTotal).
  if v_totales <> 1 then
    perform public._formula_rechazar('total_unico', null,
      format('La fórmula necesita exactamente un nodo con salida «total» (hay %s).', v_totales));
  end if;
  if v_total is not null then
    v_nodo := v_nodos -> (v_total - 1);
    v_tipo := v_tipos[v_total];
    -- soloEnDe, condicionDe y sobrescribibleDe: cada uno sólo en los tipos que lo admiten.
    if (v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en')
       or (v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion')
       or (v_tipo in ('tabla', 'tramo', 'calculo') and v_sobres[v_total]) then
      perform public._formula_rechazar('total_fijo', v_ids[v_total],
        format('El total «%s» no puede depender de una variante ni de un interruptor, ni sobrescribirse.', v_ids[v_total]));
    end if;
    -- El total es lo que se paga: un tipo de cambio, un campo, una bandera o la variante no lo son.
    if v_tipos[v_total] in ('tipo_cambio', 'campo_vehiculo', 'bandera', 'opcion') then
      perform public._formula_rechazar('total_no_es_monto', v_ids[v_total],
        format('El total «%s» tiene que dar un monto: un input, una constante, una tabla, un tramo o un cálculo.', v_ids[v_total]));
    end if;
  end if;

  -- §4 params (revisarParams): cada constante tiene su valor, y cada clave es una constante.
  for i in 1 .. v_n loop
    if v_tipos[i] = 'constante' and (v_ids[i] = 'tablas' or not p_params ? v_ids[i]) then
      perform public._formula_rechazar('constante_sin_valor', v_ids[i], format('La constante «%s» no tiene valor en params.', v_ids[i]));
    end if;
  end loop;
  for v_ref in select p.key from jsonb_each(p_params) p loop
    continue when v_ref = 'tablas';
    if not v_constantes ? v_ref then
      perform public._formula_rechazar('param_sin_constante', v_ref, format('params.%s no corresponde a ninguna constante.', v_ref));
    end if;
  end loop;

  -- §5 el par porcentaje-monto (revisarPares, decisión d). Quién lee cada nodo: el primero y, si hay, otro distinto.
  select coalesce(jsonb_object_agg(l.ref, jsonb_build_array(l.primero, l.otro)), '{}'::jsonb) into v_lectores
    from (select a.ref, a.primero, (array_agg(a.lector order by a.k) filter (where a.lector <> a.primero))[1] as otro
            from (select u.ref, u.lector, u.k, first_value(u.lector) over (partition by u.ref order by u.k) as primero
                    from unnest(v_lectores_ref, v_lectores_de) with ordinality as u(ref, lector, k)) a
           group by a.ref, a.primero) l;
  for i in 1 .. v_n loop
    continue when v_tipos[i] <> 'calculo';
    v_nodo := v_nodos -> (i - 1);
    continue when v_nodo ->> 'op' <> 'porcentaje_de';
    v_ref := v_nodo ->> 'pct';
    j := (v_pos ->> v_ref)::int;
    -- Un `porcentaje_de` es un monto y su porcentaje tiene formato pct; si se sobrescribe, su porcentaje da un monto y acepta un valor.
    v_mal := v_formatos[i] not in ('usd', 'moneda')
             or (j is not null and (v_formatos[j] <> 'pct'
                                    or (v_sobres[i] and not (v_tipos[j] in ('input', 'constante', 'tabla', 'tramo', 'calculo')
                                                             and (v_tipos[j] in ('input', 'constante', 'tipo_cambio') or v_sobres[j])))));
    if v_mal then
      perform public._formula_rechazar('par_mal_tipado', v_ids[i],
        format('«%s» es un porcentaje de otro monto: tiene que ser un monto y su porcentaje «%s», tener formato pct.', v_ids[i], v_ref));
    end if;
    if v_sobres[i] then
      v_x := v_lectores -> v_ref;
      v_otro := case when v_x ->> 0 = v_ids[i] then v_x ->> 1 else v_x ->> 0 end;
      if v_otro is not null then
        perform public._formula_rechazar('pct_compartido', v_ids[i],
          format('«%s» es el porcentaje de «%s», que se puede sobrescribir: ningún otro nodo lo puede leer (lo lee «%s»).', v_ref, v_ids[i], v_otro));
      end if;
    end if;
  end loop;

  -- §6 los tipos de cambio, los buckets y los grupos; §7 la variante.
  perform public._formula_cambio_y_grupos(v_nodos, v_pos, v_ids, v_tipos, v_formatos, v_total,
                                          p_def -> 'buckets', p_def -> 'total_en', p_def -> 'grupos');
  perform public._formula_variante(v_nodos, v_ids, v_tipos);
  perform public._formula_campos(v_nodos, v_tipos);
end;
$$;

-- Como los demás ayudantes: los ejecuta quien llama a validar_formula (no es definer): authenticated sí, anon no.
revoke all on function public._formula_campos(jsonb, text[]) from public, anon;
grant execute on function public._formula_campos(jsonb, text[]) to authenticated;
