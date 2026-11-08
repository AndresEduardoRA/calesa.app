-- 4.21-3b-2 (P2 = a): una constante auxiliar de un número escrito en el texto de su fila (`<fila>__<n>`, la que crea el compilador, 4.07) no pide
-- celda en el diseño. Se edita por el texto de su fila, y lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar` (`_nodos_visibles`),
-- así que no se filtra a nadie. Si tiene celda, vale como siempre. Una fila constante («Sumar fila», un cálculo que pasa a número) sigue pidiéndola.
--
-- `_diseno_auxiliares(p_def)` es el espejo de `cadenasDeAuxiliares()` (`entities/compilador-auxiliares.ts`); `validar_diseno()` la llama y le pasa a
-- `_diseno_secciones()` los tipos con cada constante auxiliar marcada como `constante_auxiliar`. Ese arreglo sólo decide §5: en §2 a §4,
-- `_diseno_secciones()` compara el tipo con `opcion`, `bandera`, `tabla` y `calculo`, nunca con `constante`, así que una auxiliar con celda o con
-- atajos se revisa igual que antes (`atajos_no_es_tabla`, `subtotal_no_es_calculo`). Así no se copia el cuerpo de `_diseno_secciones()`.

-- Los ids de las auxiliares de una fórmula, como `{id: true}`. La raíz es una `constante` o un `calculo` con `texto`; su cadena son los k nodos de justo
-- antes cuando (a) el de justo antes termina en `__<k>` (entero desde 1, sin ceros a la izquierda, k ≤ los nodos de antes); (b) son, en orden,
-- `aux(raíz, 1..k)` con el recorte a 41 de `idAuxiliar()`; (c) ninguno lleva texto; (d) a cada uno lo nombra exactamente un nodo de la cadena o la
-- raíz (`referenciasDe()`, una vez por nodo); (e) el texto de la raíz no nombra a ninguno (los nombres del léxico del compilador); y (f) ninguna
-- posición la tomó una cadena anterior. (f) no se alcanza (una cadena anterior de raíz q no pasa por q, que tiene texto, y (c) la corta): se espeja
-- igual, literal, y no lleva prueba. Invocadora, sin leer tablas; desarma la fórmula una vez y no vuelve a leer `p_def` en el bucle.
create function public._diseno_auxiliares(p_def jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_ids text[];
  v_tx text[];        -- el texto de una constante o un cálculo (nulo: no lleva)
  v_refs jsonb[];     -- los ids que lee cada nodo, sin repetir (referenciasDe)
  v_n int;
  v_tomada boolean[];
  v_lista text[] := '{}';  -- los ids de las auxiliares; el objeto se arma al final (concatenar un jsonb en el bucle sería cuadrático)
  v_raiz text;
  v_suf text;
  v_k int;
  v_ok boolean;
  v_cuenta jsonb;
  v_r text;
  v_ri jsonb;
  v_texto text;
  v_nombres jsonb;
begin
  select coalesce(array_agg(x.value ->> 'id' order by x.pos), '{}'),
         coalesce(array_agg(case when x.value ->> 'tipo' in ('constante', 'calculo') then x.value ->> 'texto' end order by x.pos), '{}'),
         coalesce(array_agg(
           (select coalesce(jsonb_agg(distinct r.id), '[]'::jsonb)
              from (select x.value ->> 'sugerido_de' where x.value ->> 'tipo' = 'input'
                    union all select x.value ->> 'requerido_si' where x.value ->> 'tipo' = 'input'
                    union all select x.value ->> 'condicion' where x.value ->> 'tipo' in ('input', 'constante', 'tabla', 'tramo', 'calculo')
                    union all select d.value
                                from jsonb_array_elements_text(case when x.value ->> 'tipo' = 'calculo' and jsonb_typeof(x.value -> 'de') = 'array'
                                                                    then x.value -> 'de' else '[]'::jsonb end) d
                    union all select x.value ->> 'pct' where x.value ->> 'tipo' = 'calculo' and x.value ->> 'op' = 'porcentaje_de'
                    union all select x.value ->> 'sobre'
                               where (x.value ->> 'tipo' = 'calculo' and x.value ->> 'op' = 'depreciar') or x.value ->> 'tipo' = 'tramo'
                    union all select m.value
                                from jsonb_each_text(case when x.value ->> 'tipo' = 'tabla' and jsonb_typeof(x.value -> 'match') = 'object'
                                                          then x.value -> 'match' else '{}'::jsonb end) m) r(id)
             where r.id is not null)
           order by x.pos), '{}')
    into v_ids, v_tx, v_refs
    from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) with ordinality as x(value, pos);
  v_n := coalesce(array_length(v_ids, 1), 0);
  v_tomada := array_fill(false, array[greatest(v_n, 1)]);

  for p in 2 .. v_n loop
    v_raiz := v_ids[p];
    continue when v_tx[p] is null;
    -- (a) el k del de justo antes.
    v_suf := substring(v_ids[p - 1] from '__([1-9][0-9]*)$');
    continue when v_suf is null or length(v_suf) > 9;
    v_k := v_suf::int;
    continue when v_k > p - 1;
    -- (b) y (c): los extremos primero (O(1)), después la cadena entera.
    continue when v_ids[p - v_k] is distinct from left(v_raiz, 41 - length('__1')) || '__1'
               or v_ids[p - 1] is distinct from left(v_raiz, 41 - length('__' || v_k)) || '__' || v_k;
    v_ok := true;
    for i in 1 .. v_k loop
      if v_ids[p - v_k + i - 1] is distinct from left(v_raiz, 41 - length('__' || i)) || '__' || i or v_tx[p - v_k + i - 1] is not null then
        v_ok := false;
        exit;
      end if;
    end loop;
    continue when not v_ok;
    -- (d) cuántos nodos de la cadena y la raíz nombran a cada id (cada nodo, una vez).
    v_cuenta := '{}'::jsonb;
    -- Sin consultas que nombren un arreglo: cada una lo recibiría entero como parámetro (O(nodos) por fila). El elemento va antes a una variable.
    for i in p - v_k .. p loop
      v_ri := v_refs[i];
      for j in 0 .. jsonb_array_length(v_ri) - 1 loop
        v_r := v_ri ->> j;
        v_cuenta := v_cuenta || jsonb_build_object(v_r, coalesce((v_cuenta ->> v_r)::int, 0) + 1);
      end loop;
    end loop;
    for i in p - v_k .. p - 1 loop
      if (v_cuenta ->> v_ids[i]) is distinct from '1' then
        v_ok := false;
        exit;
      end if;
    end loop;
    continue when not v_ok;
    -- (e) el texto de la raíz no nombra a ninguno. Si ningún id aparece como subcadena, no aparece como nombre; si alguno aparece, los nombres
    -- salen del patrón, que da los mismos que el léxico (lo prueba `compilador-auxiliares.test.ts`, T1b, y que este texto lo copie, T1c).
    for i in p - v_k .. p - 1 loop
      if strpos(v_tx[p], v_ids[i]) > 0 then
        v_ok := false;
        exit;
      end if;
    end loop;
    if not v_ok then
      v_texto := v_tx[p];
      select coalesce(jsonb_object_agg(t.nombre, true), '{}'::jsonb)
        into v_nombres
        from (select m[1] as nombre
                from regexp_matches(v_texto, '[0123456789.][ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$.]*|[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$][ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$]*', 'g') as m) t
       where left(t.nombre, 1) not in ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.');
      v_ok := true;
      for i in p - v_k .. p - 1 loop
        if v_nombres ? v_ids[i] then
          v_ok := false;
          exit;
        end if;
      end loop;
      continue when not v_ok;
    end if;
    -- (f) ninguna posición tomada (no se alcanza: ver arriba).
    for i in p - v_k .. p - 1 loop
      if v_tomada[i] then
        v_ok := false;
        exit;
      end if;
    end loop;
    continue when not v_ok;
    for i in p - v_k .. p - 1 loop
      v_tomada[i] := true;
      v_lista := array_append(v_lista, v_ids[i]);
    end loop;
  end loop;
  return (select coalesce(jsonb_object_agg(a, true), '{}'::jsonb) from unnest(v_lista) a);
end;
$fn$;

revoke all on function public._diseno_auxiliares(jsonb) from public, anon;
grant execute on function public._diseno_auxiliares(jsonb) to authenticated, service_role;

-- validar_diseno: la vigente de la base; sólo suma las auxiliares y los tipos de §5.
create or replace function public.validar_diseno(p_def jsonb, p_diseno jsonb, p_niveles text[], p_retirados text[], p_tonos text[])
returns void
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_nodos jsonb;
  v_buckets jsonb;
  v_total_en text;
  v_grupos jsonb;
  v_pos jsonb;
  v_ids text[];
  v_tipos text[];
  v_ops text[];
  v_salidas text[];
  v_sobres boolean[];
  v_pcts text[];
  v_cond jsonb;
  v_req jsonb;
  v_niv jsonb;
  v_ret jsonb;
  v_ton jsonb;
  v_g jsonb;
  v_modos jsonb;
  v_aux jsonb;
  v_tipos_hoja text[];
begin
  -- §0 la forma.
  perform public._diseno_forma(p_diseno);

  -- La fórmula, desarmada una vez: un id, una posición.
  v_nodos := p_def -> 'nodos';
  v_buckets := p_def -> 'buckets';
  v_total_en := p_def ->> 'total_en';
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(x.value ->> 'op' order by x.pos),
         array_agg(x.value ->> 'salida' order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         array_agg(x.value ->> 'pct' order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'condicion', true) filter (where x.value ->> 'condicion' is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(x.value ->> 'requerido_si', true) filter (where x.value ->> 'requerido_si' is not null), '{}'::jsonb)
    into v_pos, v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts, v_cond, v_req
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);

  -- Las auxiliares de los textos (4.21-3b-2): una constante auxiliar no pide celda en §5.
  v_aux := public._diseno_auxiliares(p_def);
  v_tipos_hoja := array(select case when t.tipo = 'constante' and v_aux ? t.id then 'constante_auxiliar' else t.tipo end
                          from unnest(v_ids, v_tipos) with ordinality as t(id, tipo, ord)
                         order by t.ord);

  -- El contexto, como conjuntos.
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_niv from unnest(p_niveles) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ret from unnest(p_retirados) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;

  -- §1 los modos.
  v_modos := p_diseno -> 'cabecera' -> 'modos';
  perform public._diseno_modos(v_modos, v_buckets, coalesce(cardinality(array(select jsonb_object_keys(v_buckets))), 0),
                               v_total_en, v_pos, v_tipos);

  -- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura.
  perform public._diseno_secciones(p_diseno -> 'secciones', p_diseno -> 'tarjeta_total', v_ids, v_tipos_hoja, v_ops, v_salidas, v_sobres, v_pcts,
                                   v_pos, v_cond, v_req, v_niv, v_ret);

  -- §6 el tono de cada grupo de la fórmula está en el catálogo de la empresa.
  for i in 0 .. jsonb_array_length(v_grupos) - 1 loop
    v_g := v_grupos -> i;
    if not coalesce(v_ton ? (v_g ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_g ->> 'id',
        format('El grupo «%s» usa un tono que no está en el catálogo.', v_g ->> 'id'));
    end if;
  end loop;
end;
$fn$;
