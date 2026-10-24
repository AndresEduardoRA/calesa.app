-- `editar_sin_ver` (paso 4.09, prompt 1; docs/COTIZADOR.md › «Las reglas (4.09-1)»): lo que no se ve no se edita. Un nivel de ver restringido con el de editar abierto se
-- rechaza, en una sección (justo después de sus niveles; `donde` = su id) y en una celda (su nivel efectivo, después de `nivel_no_admitido` y antes de
-- `nodo_repetido`; `donde` = el nodo). Ver abierto con editar restringido vale: se ve y no se edita sin el permiso. Dos niveles restringidos distintos también valen
-- (`_nodos_visibles()` exige ver para editar). Es `_diseno_secciones()` entera (create or replace) con esas dos comprobaciones más; la firma y los grants no cambian.

create or replace function public._diseno_secciones(
  p_secs jsonb, p_tarjeta jsonb, p_ids text[], p_tipos text[], p_ops text[], p_salidas text[], p_sobres boolean[], p_pcts text[],
  p_pos jsonb, p_cond jsonb, p_req jsonb, p_niveles jsonb, p_retirados jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare
  v_n int := coalesce(array_length(p_ids, 1), 0);
  v_aver text[] := array_fill(null::text, array[v_n]);     -- con qué nivel de ver se dibuja el nodo (nulo: no se dibuja)
  v_aedit text[] := array_fill(null::text, array[v_n]);    -- con qué nivel de editar
  v_atajo boolean[] := array_fill(false, array[v_n]);      -- ya tiene unos atajos
  v_visto boolean[] := array_fill(false, array[v_n]);      -- ya es un secundario de la tarjeta
  v_a_nodo int[] := '{}'::int[];                           -- los atajos, en el orden del diseño: nodo, niveles de su sección
  v_a_ver text[] := '{}'::text[];
  v_a_edit text[] := '{}'::text[];
  v_dup boolean[];
  v_s jsonb;
  v_its jsonb;
  v_it jsonb;
  v_sid text;
  v_hver text;
  v_hedit text;
  v_ver text;
  v_edit text;
  v_tipo text;
  v_nodo text;
  v_ntipo text;
  v_efecto text;
  v_pct text;
  v_esp boolean;
  j int;
  l int;
begin
  -- §2 las secciones, en orden. Una sección repite el id de una anterior.
  select coalesce(array_agg(d.rn > 1 order by d.ord), '{}')
    into v_dup
    from (select x.ord, row_number() over (partition by x.value ->> 'id' order by x.ord) as rn
            from jsonb_array_elements(p_secs) with ordinality as x(value, ord)) d;
  for i in 1 .. coalesce(array_length(v_dup, 1), 0) loop
    v_s := p_secs -> (i - 1);
    v_sid := v_s ->> 'id';
    if v_dup[i] then
      perform public._formula_rechazar('seccion_duplicada', v_sid, format('Hay dos secciones con el id «%s».', v_sid));
    end if;
    perform public._diseno_nivel(v_s ->> 'nivel_ver', v_sid, p_niveles, p_retirados);
    perform public._diseno_nivel(v_s ->> 'nivel_editar', v_sid, p_niveles, p_retirados);
    v_hver := coalesce(v_s ->> 'nivel_ver', 'todos');
    v_hedit := coalesce(v_s ->> 'nivel_editar', 'todos');
    -- Lo lo que no se ve no se edita: ver restringido con editar abierto se rechaza (ver abierto con editar restringido vale).
    if v_hver <> 'todos' and v_hedit = 'todos' then
      perform public._formula_rechazar('editar_sin_ver', v_sid, format('«%s» se ve sólo con un nivel y se edita sin él: lo que no se ve no se edita. Ponle también un nivel de edición.', v_sid));
    end if;
    v_its := v_s -> 'items';

    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      v_it := v_its -> k;
      v_tipo := v_it ->> 'tipo';
      v_nodo := v_it ->> 'nodo';
      j := (p_pos ->> v_nodo)::int;
      if j is null then
        perform public._formula_rechazar('nodo_inexistente', v_nodo,
          format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
      end if;
      v_ntipo := p_tipos[j];
      v_esp := v_ntipo = 'calculo' and p_ops[j] = 'porcentaje_de';
      v_ver := v_hver;
      v_edit := v_hedit;

      if v_tipo = 'celda' then
        if v_ntipo in ('opcion', 'bandera') then
          perform public._formula_rechazar('celda_no_es_valor', v_nodo,
            format('«%s» no se dibuja como celda: la variante va como chips y una bandera como interruptor.', v_nodo));
        end if;
        if v_it ? 'secundario' and not v_esp then
          perform public._formula_rechazar('secundario_sin_porcentaje', v_nodo,
            format('«%s» lleva un secundario y no es un porcentaje de otro monto.', v_nodo));
        end if;
        if v_esp and p_sobres[j] and not (v_it ? 'secundario') then
          perform public._formula_rechazar('par_sin_secundario', v_nodo,
            format('«%s» es un monto con su porcentaje y se sobrescribe: el par es una sola celda con su secundario.', v_nodo));
        end if;
        perform public._diseno_nivel(v_it ->> 'nivel_ver', v_nodo, p_niveles, p_retirados);
        perform public._diseno_nivel(v_it ->> 'nivel_editar', v_nodo, p_niveles, p_retirados);
        v_ver := coalesce(v_it ->> 'nivel_ver', v_hver);
        v_edit := coalesce(v_it ->> 'nivel_editar', v_hedit);
      elsif v_tipo = 'atajos' then
        if v_ntipo <> 'tabla' then
          perform public._formula_rechazar('atajos_no_es_tabla', v_nodo,
            format('Los atajos de «%s» van sobre un nodo de tabla, y ese nodo no lo es.', v_nodo));
        end if;
        if not p_sobres[j] then
          perform public._formula_rechazar('atajos_no_sobrescribible', v_nodo,
            format('Los atajos de «%s» eligen una fila y dejan su valor como sugerido: la tabla tiene que poder sobrescribirse.', v_nodo));
        end if;
      elsif v_tipo = 'variante' then
        if v_ntipo <> 'opcion' then
          perform public._formula_rechazar('variante_no_es_opcion', v_nodo,
            format('«%s» no es la variante de la fórmula.', v_nodo));
        end if;
      elsif v_tipo = 'interruptor' then
        if v_ntipo <> 'bandera' then
          perform public._formula_rechazar('interruptor_no_es_bandera', v_nodo,
            format('«%s» no es una bandera: un interruptor la enciende.', v_nodo));
        end if;
        -- «Habilita» apaga lo que la bandera condiciona o pide; «muestra», sólo lo que condiciona.
        v_efecto := v_it ->> 'efecto';
        if not (p_cond ? v_nodo) and not (v_efecto = 'habilita' and p_req ? v_nodo) then
          perform public._formula_rechazar('interruptor_sin_efecto', v_nodo,
            format('La bandera «%s» no condiciona ningún nodo: su interruptor no haría nada.', v_nodo));
        end if;
      elsif v_tipo = 'subtotal' then
        if v_ntipo <> 'calculo' then
          perform public._formula_rechazar('subtotal_no_es_calculo', v_nodo,
            format('«%s» no es un cálculo: un subtotal se dibuja desde uno.', v_nodo));
        end if;
      end if;

      -- El total, lo que va aparte y la variante los recibe todo el mundo (D7). «Lo que va aparte» incluye el porcentaje que muestra una celda con
      -- secundario y la bandera de un interruptor (4-9): se dibujan con el nivel de su ítem y la base los manda igual.
      if v_ver <> 'todos'
         and (v_tipo = 'variante' or (v_tipo in ('celda', 'subtotal') and p_salidas[j] in ('total', 'aparte'))) then
        perform public._formula_rechazar('nivel_no_admitido', v_nodo,
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', v_nodo));
      end if;
      if v_ver <> 'todos' and v_tipo = 'celda' and v_it ? 'secundario' and p_salidas[(p_pos ->> p_pcts[j])::int] in ('total', 'aparte') then
        perform public._formula_rechazar('nivel_no_admitido', p_pcts[j],
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', p_pcts[j]));
      end if;
      if v_ver <> 'todos' and v_tipo = 'interruptor' and p_salidas[j] in ('total', 'aparte') then
        perform public._formula_rechazar('nivel_no_admitido', v_nodo,
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', v_nodo));
      end if;
      -- Una celda con su nivel de ver restringido y el de editar abierto (la sección ya revisada no lo tiene: sólo lo rompe el nivel propio de la celda).
      if v_tipo = 'celda' and v_ver <> 'todos' and v_edit = 'todos' then
        perform public._formula_rechazar('editar_sin_ver', v_nodo, format('«%s» se ve sólo con un nivel y se edita sin él: lo que no se ve no se edita. Ponle también un nivel de edición.', v_nodo));
      end if;

      -- Dónde se dibuja el valor del nodo (y el del porcentaje de un par); un segundo dibujo es `nodo_repetido`.
      if v_tipo = 'atajos' then
        if v_atajo[j] then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_atajo[j] := true;
        v_a_nodo := array_append(v_a_nodo, j);
        v_a_ver := array_append(v_a_ver, v_hver);
        v_a_edit := array_append(v_a_edit, v_hedit);
      else
        if v_aver[j] is not null then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_aver[j] := v_ver;
        v_aedit[j] := v_edit;
        if v_tipo = 'celda' and v_it ? 'secundario' then
          v_pct := p_pcts[j];
          l := (p_pos ->> v_pct)::int;
          if v_aver[l] is not null then
            perform public._formula_rechazar('nodo_repetido', v_pct, format('«%s» aparece dos veces en el diseño.', v_pct));
          end if;
          v_aver[l] := v_ver;
          v_aedit[l] := v_edit;
        end if;
      end if;
    end loop;
  end loop;

  -- §3 la tarjeta: el total y sus secundarios (la garantía), que repiten lo que la hoja ya dibuja.
  v_nodo := p_tarjeta ->> 'nodo';
  j := (p_pos ->> v_nodo)::int;
  if j is null then
    perform public._formula_rechazar('nodo_inexistente', v_nodo,
      format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
  end if;
  if p_salidas[j] is distinct from 'total' then
    perform public._formula_rechazar('tarjeta_no_es_el_total', v_nodo,
      format('La tarjeta nombra «%s», que no es el total de la fórmula.', v_nodo));
  end if;
  v_its := p_tarjeta -> 'secundarios';
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    v_nodo := v_its ->> k;
    j := (p_pos ->> v_nodo)::int;
    if j is null then
      perform public._formula_rechazar('nodo_inexistente', v_nodo,
        format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
    end if;
    if p_salidas[j] is distinct from 'aparte' then
      perform public._formula_rechazar('tarjeta_secundario_no_es_aparte', v_nodo,
        format('«%s» es un secundario de la tarjeta y no es una salida «aparte».', v_nodo));
    end if;
    if v_visto[j] then
      perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
    end if;
    v_visto[j] := true;
  end loop;

  -- §4 un atajos va sobre la celda de su nodo (o el porcentaje que ella muestra) y con sus mismos niveles.
  for i in 1 .. coalesce(array_length(v_a_nodo, 1), 0) loop
    j := v_a_nodo[i];
    if v_aver[j] is null then
      perform public._formula_rechazar('atajos_sin_celda', p_ids[j],
        format('Los atajos de «%s» necesitan la celda de ese nodo en el diseño.', p_ids[j]));
    end if;
    if v_aver[j] <> v_a_ver[i] or v_aedit[j] <> v_a_edit[i] then
      perform public._formula_rechazar('nodo_con_dos_niveles', p_ids[j],
        format('Los atajos de «%s» y su celda tienen niveles distintos: tienen que ser los mismos.', p_ids[j]));
    end if;
  end loop;

  -- §5 lo que la hoja tiene que dibujar sí o sí, en el orden de la fórmula: todo input y constante, la variante y las banderas que
  -- condicionan algo o piden un dato.
  for n in 1 .. v_n loop
    if v_aver[n] is null
       and (p_tipos[n] in ('input', 'constante', 'opcion')
            or (p_tipos[n] = 'bandera' and (p_cond ? p_ids[n] or p_req ? p_ids[n]))) then
      perform public._formula_rechazar('nodo_sin_seccion', p_ids[n],
        format('«%s» no está en ninguna sección del diseño.', p_ids[n]));
    end if;
  end loop;
end;
$$;
