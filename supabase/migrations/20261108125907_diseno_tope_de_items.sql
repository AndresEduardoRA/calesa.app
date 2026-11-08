-- El tope de tamaño del diseño (paso 4.22-6, cierra 4-30): un diseño publicable lleva a lo sumo 40 ítems sumando todas sus secciones
-- (de cualquier tipo, principal o avanzado; la cabecera y la tarjeta no cuentan). La semilla más grande, `subasta_usa`, tiene 39; con
-- 40 la hoja queda en el techo de nodos (docs/RENDIMIENTO.md › «Cotizador»). `validar_diseno()` lo revisa tras la forma y antes de los
-- modos, con la regla `demasiados_items` y la sección en `hint`; el borrador lo admite (sólo mira la forma) y publicar lo rechaza.
-- El espejo TS: `MAXIMO_DE_ITEMS_DEL_DISENO` y `validarDiseno()` (src/modules/cotizaciones/entities/). El número vive en una función
-- aparte para que las mediciones de escala (`medir-validar-diseno.sql`, `medir-publicar.sql`) lo apaguen en su transacción revertida.

create or replace function public._diseno_maximo_de_items() returns integer
language sql
stable
set search_path = ''
as $$
  select 40
$$;

revoke all on function public._diseno_maximo_de_items() from public, anon;
grant execute on function public._diseno_maximo_de_items() to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."validar_diseno"("p_def" "jsonb", "p_diseno" "jsonb", "p_niveles" "text"[], "p_retirados" "text"[], "p_tonos" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
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
  v_max integer;
  v_items integer := 0;
begin
  -- §0 la forma.
  perform public._diseno_forma(p_diseno);

  -- §0b el tamaño (4-30): sólo contar, antes que todo lo demás. `donde` es la sección en la que la suma pasa del tope.
  v_max := public._diseno_maximo_de_items();
  for i in 0 .. jsonb_array_length(p_diseno -> 'secciones') - 1 loop
    v_items := v_items + jsonb_array_length(p_diseno -> 'secciones' -> i -> 'items');
    if v_items > v_max then
      perform public._formula_rechazar('demasiados_items', p_diseno -> 'secciones' -> i ->> 'id',
        format('La hoja admite hasta %s ítems y el diseño pasa de ese tope en «%s»: quita alguno.', v_max,
               p_diseno -> 'secciones' -> i ->> 'id'));
    end if;
  end loop;

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

  -- El contexto, como conjuntos.
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_niv from unnest(p_niveles) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ret from unnest(p_retirados) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;

  -- §1 los modos.
  v_modos := p_diseno -> 'cabecera' -> 'modos';
  perform public._diseno_modos(v_modos, v_buckets, coalesce(cardinality(array(select jsonb_object_keys(v_buckets))), 0),
                               v_total_en, v_pos, v_tipos);

  -- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura.
  perform public._diseno_secciones(p_diseno -> 'secciones', p_diseno -> 'tarjeta_total', v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts,
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
$$;
