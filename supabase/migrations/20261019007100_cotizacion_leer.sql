-- Leer una cotización sin lo que quien lee no ve (paso 4.10, prompt 1; D7: «lo que no se ve no viaja»).
--
-- `…006800` quitó la lectura directa del snapshot. Esta migración da el camino que queda:
--
--   - `_cotizacion_recorte(resultado, visibles, definición, ocultos)`: el ÚNICO punto del recorte, puro y de nadie. Recibe lo que tiene una cotización o lo que calcula
--     `evaluar_formula()` (`valores`, `estados`, `fuentes`, `totales`, `faltantes`, `overrides_descartados`, `tipos_cambio`) y deja lo que quien llama puede ver.
--   - `cotizacion_leer(id)`: la fila legible más el snapshot recortado, con la `visibilidad` de SU versión de la fórmula (`formula_id`), nunca la vigente.
--
-- Las reglas del recorte (`docs/DECISIONES.md`, «Paso 4.10 (1 de 3)»):
--   - Un nodo viaja si `_nodos_visibles(formula_id)` lo da, y SIEMPRE viajan el nodo total y los de salida `aparte` (D7: la base manda el total y lo aparte a quien ve la
--     cotización); un nodo que la `visibilidad` no nombra sólo viaja a quien configura el origen.
--   - Los subtotales por grupo (`totales.grupos`) no son nodos y `visibilidad` no los cubre: un grupo viaja si quien llama ve TODOS sus nodos (si no, el subtotal más los que ve
--     delataría el que no ve). Su Bs además sólo si ningún tipo de cambio de la fórmula está restringido por un nivel que quien llama no tiene (Bs ÷ USD es ese tipo de cambio).
--     `bs`, `usd` y `suma_usd` del total viajan siempre. Cualquier otra clave de `totales` (la forma de la Fase 0) no viaja: falla cerrada.
--   - `tipos_cambio` (lo congelado): una clave viaja salvo que su nodo esté restringido por un nivel que quien llama no tiene. Un tipo de cambio que el diseño no dibuja no figura en
--     `visibilidad`, pero es la tarifa pública de la empresa (la tabla `tipos_cambio` la lee toda sesión) y no se sobrescribe: no cuenta como oculto.
--   - Una falta (`faltantes`) viaja si su `donde` es visible (un nodo, el total o un grupo que viaja) y su `ref`, si es un nodo, también. Las demás no viajan ni se cuentan: sólo
--     `hay_faltantes_ocultos: true`, que se omite cuando es falso, así la salida de quien lo ve todo es exactamente la del motor.
--   - Un override descartado viaja si es de un nodo visible o de un id que la fórmula no tiene (`nodo_inexistente`).

create or replace function public._cotizacion_recorte(p_res jsonb, p_visibles text[], p_def jsonb, p_ocultos text[])
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb := coalesce(p_def -> 'nodos', '[]'::jsonb);
  v_ids text[]; v_total text; v_aparte text[]; v_ok text[]; v_grupos text[]; v_tc_oculto boolean;
  v_out jsonb := '{}'::jsonb; v_t jsonb; v_hay boolean := false; k text;
begin
  v_ids := coalesce(array(select n ->> 'id' from jsonb_array_elements(v_nodos) n), '{}');
  select n ->> 'id' into v_total from jsonb_array_elements(v_nodos) n where n ->> 'salida' = 'total' limit 1;
  v_aparte := coalesce(array(select n ->> 'id' from jsonb_array_elements(v_nodos) n where n ->> 'salida' = 'aparte'), '{}');
  v_ok := coalesce(p_visibles, '{}') || array_remove(array[v_total], null) || v_aparte;
  v_tc_oculto := exists (select 1 from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'tipo_cambio' and (n ->> 'id') = any (coalesce(p_ocultos, '{}')));
  v_grupos := coalesce(array(
    select gr ->> 'id' from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) gr
     where not exists (select 1 from jsonb_array_elements(v_nodos) n where n ->> 'grupo' = gr ->> 'id' and (n ->> 'id') <> all (v_ok))), '{}');

  foreach k in array array['valores', 'estados', 'fuentes'] loop
    if jsonb_typeof(p_res -> k) = 'object' then
      v_out := v_out || jsonb_build_object(k, coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> k) e where e.key = any (v_ok)), '{}'::jsonb));
    end if;
  end loop;

  if jsonb_typeof(p_res -> 'tipos_cambio') = 'object' then
    v_out := v_out || jsonb_build_object('tipos_cambio', coalesce((
      select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> 'tipos_cambio') e
       where not exists (select 1 from jsonb_array_elements(v_nodos) n
                          where n ->> 'tipo' = 'tipo_cambio' and n ->> 'clave' = e.key and (n ->> 'id') = any (coalesce(p_ocultos, '{}')))), '{}'::jsonb));
  end if;

  if jsonb_typeof(p_res -> 'totales') = 'object' then
    v_t := '{}'::jsonb;
    if jsonb_typeof(p_res -> 'totales' -> 'grupos') = 'object' then
      v_t := jsonb_build_object('grupos', coalesce((
        select jsonb_object_agg(e.key,
                 case when jsonb_typeof(e.value) = 'object'
                      then coalesce((select jsonb_object_agg(f.key, f.value) from jsonb_each(e.value) f
                                      where f.key in ('usd', 'se_dibuja') or (f.key = 'bs' and not v_tc_oculto)), '{}'::jsonb)
                      else e.value end)
          from jsonb_each(p_res -> 'totales' -> 'grupos') e where e.key = any (v_grupos)), '{}'::jsonb));
    end if;
    foreach k in array array['bs', 'usd', 'suma_usd'] loop
      if p_res -> 'totales' ? k then v_t := v_t || jsonb_build_object(k, p_res -> 'totales' -> k); end if;
    end loop;
    v_out := v_out || jsonb_build_object('totales', v_t);
  end if;

  if jsonb_typeof(p_res -> 'faltantes') = 'array' then
    select coalesce(jsonb_agg(e.value order by e.ord) filter (where e.viaja), '[]'::jsonb), coalesce(bool_or(not e.viaja), false) into v_t, v_hay
      from (select f.value, f.ord,
                   ((f.value ->> 'donde') = any (v_ok) or (f.value ->> 'donde') = 'total' or (f.value ->> 'donde') = any (v_grupos))
                   and ((f.value ->> 'ref') is null or (f.value ->> 'ref') <> all (v_ids) or (f.value ->> 'ref') = any (v_ok)) as viaja
              from jsonb_array_elements(p_res -> 'faltantes') with ordinality f (value, ord)) e;
    v_out := v_out || jsonb_build_object('faltantes', v_t);
    if v_hay then v_out := v_out || jsonb_build_object('hay_faltantes_ocultos', true); end if;
  end if;

  if jsonb_typeof(p_res -> 'overrides_descartados') = 'array' then
    v_out := v_out || jsonb_build_object('overrides_descartados', coalesce((
      select jsonb_agg(e.value order by e.ord) from jsonb_array_elements(p_res -> 'overrides_descartados') with ordinality e (value, ord)
       where (e.value ->> 'id') = any (v_ok) or (e.value ->> 'id') <> all (v_ids)), '[]'::jsonb));
  end if;
  return v_out;
end $$;
revoke all on function public._cotizacion_recorte(jsonb, text[], jsonb, text[]) from public, anon, authenticated;
comment on function public._cotizacion_recorte(jsonb, text[], jsonb, text[]) is
  'El recorte por nivel de lo que tiene una cotización o calcula evaluar_formula(): sólo lo visible, el total y lo aparte, y los subtotales de los grupos que se ven enteros. De nadie; la llaman cotizacion_leer, cotizacion_evaluar y cotizacion_revisiones. docs/COTIZADOR.md › «En la base (4.10-1)».';

create or replace function public.cotizacion_leer(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c public.cotizaciones; v_def jsonb; v_vis jsonb; v_visibles text[]; v_ocultos text[]; v_cols jsonb;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = c.formula_id;
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(c.formula_id) n), '{}');
  -- Lo que la visibilidad nombra y quien lee no ve: un tipo de cambio de ésos oculta los Bs de los grupos y su propia tarifa.
  v_ocultos := coalesce(array(select k from jsonb_object_keys(v_vis) k where k <> all (v_visibles)), '{}');
  -- Las columnas que se devuelven son las que `authenticated` lee: el grant de columnas es la única fuente (una columna nueva sin grant no viaja).
  select coalesce(jsonb_object_agg(a.attname, to_jsonb(c) -> a.attname), '{}'::jsonb) into v_cols
    from pg_attribute a
   where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select');
  return jsonb_build_object('cotizacion', v_cols)
      || public._cotizacion_recorte(jsonb_build_object('valores', c.valores, 'fuentes', c.fuentes, 'totales', c.totales, 'tipos_cambio', c.tipos_cambio), v_visibles, v_def, v_ocultos);
end $$;
revoke all on function public.cotizacion_leer(uuid) from public, anon;
grant execute on function public.cotizacion_leer(uuid) to authenticated;
comment on function public.cotizacion_leer(uuid) is
  'Una cotización con su snapshot recortado por nivel (_nodos_visibles de SU versión de la fórmula): siempre el total y lo aparte; los subtotales por grupo sólo si se ve el grupo entero. docs/COTIZADOR.md › «En la base (4.10-1)».';
