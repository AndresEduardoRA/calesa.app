-- Las tablas de referencia se leen por lo que la hoja ve (paso 4.10, prompt 1; D7, H3 y H4: «lo que alguien no puede ver no viaja»).
--
-- Una tabla de referencia (el transporte, la depreciación, las comisiones) alimenta nodos de la fórmula, y sus filas traen columnas que pueden ser de un nivel: la de «oficina» del
-- transporte es lo que le cuesta a la empresa, y «cliente», lo que se le cobra. La policy de lectura de `tablas_referencia(_filas)` era `true`: cualquier sesión leía todas las filas de
-- todas las tablas, también la columna de los costos. Ahora:
--
--   - La policy de lectura pide `cotizaciones.configurar` del origen de la tabla (o de cualquier origen, para una compartida): es la tabla de quien la edita (4.23).
--   - `cotizacion_tabla(clave, cotización | origen)` es el camino de quien cotiza: devuelve la tabla sólo si algún nodo que quien llama VE la lee (un `tabla`, un `tramo` o un `depreciar`), y sólo
--     las columnas que leen esos nodos —las de su `match`, su `columna`, `desde` y `hasta` en un tramo— más la columna que etiqueta unos atajos que se ven. Sin eso, el mismo
--     42501 que da una tabla que no existe: una `ayuda` sola no da nada. Quien configura el origen recibe la tabla entera.
--   - Las filas son las de la copia congelada de `params.tablas` de la versión de la cotización (o de la publicada, por origen) si existe —aunque esté vacía—; si no, las vivas, con la
--     resolución de `_cotizacion_armar()`: la del origen y, si no hay una activa, la compartida. Hasta 1.000 filas (`hay_mas` dice si había más).
--
-- Y los permisos `cotizaciones.ver` y `cotizaciones.configurar` dicen ahora dónde los aplica la base (`aplicado_en`).

drop policy if exists "tablas_referencia: leer" on public.tablas_referencia;
create policy "tablas_referencia: leer" on public.tablas_referencia for select to authenticated using (
  origen_id = any ((select public.origenes_con_alcance('cotizaciones.configurar', 'propios'))::uuid[])
  or (origen_id is null and (select public.tiene_permiso('cotizaciones.configurar')))
);
drop policy if exists "tablas_referencia_filas: leer" on public.tablas_referencia_filas;
create policy "tablas_referencia_filas: leer" on public.tablas_referencia_filas for select to authenticated using (
  exists (select 1 from public.tablas_referencia t where t.id = tabla_id)
);

create or replace function public.cotizacion_tabla(p_tabla text, p_cotizacion uuid default null, p_origen uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_formula uuid; v_origen uuid; v_def jsonb; v_par jsonb; v_diseno jsonb; v_cfg boolean; v_visibles text[]; v_vis jsonb;
  v_tabla public.tablas_referencia; v_congelada jsonb; v_permitidas jsonb; v_filas jsonb; v_cols jsonb; v_hay boolean := false; v_nodos jsonb;
begin
  perform public.assert_activo();
  if (p_cotizacion is null) = (p_origen is null) then
    raise exception 'Pide una cotización o un origen, y no los dos ni ninguno.' using errcode = '22023';
  end if;
  if p_cotizacion is not null then
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select c.formula_id, c.origen_id into v_formula, v_origen from public.cotizaciones c where c.id = p_cotizacion;
  else
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    v_origen := p_origen;
    select f.id into v_formula from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
  end if;
  select f.definicion, f.params, f.diseno into v_def, v_par, v_diseno from public.formulas f where f.id = v_formula;
  v_nodos := coalesce(v_def -> 'nodos', '[]'::jsonb);
  v_cfg := public.tiene_permiso('cotizaciones.configurar', v_origen);

  -- Las columnas que leen los nodos que quien llama ve (sin configurar). Si ninguno la lee, la tabla es como si no existiera.
  if not v_cfg then
    v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(v_formula) n), '{}');
    v_vis := coalesce((select jsonb_object_agg(x, true) from unnest(v_visibles) x), '{}'::jsonb);
    select jsonb_object_agg(c, true) into v_permitidas from (
      select jsonb_object_keys(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' else '{}'::jsonb end) as c
        from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'tabla' and n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id')
      union select n ->> 'columna' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'columna') is not null
      union select 'desde' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'tipo' = 'tramo' or n ->> 'op' = 'depreciar')
      union select 'hasta' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'tipo' = 'tramo' or n ->> 'op' = 'depreciar')
      -- La columna que etiqueta unos atajos que se ven.
      union select it ->> 'columna'
        from jsonb_array_elements(coalesce(v_diseno -> 'secciones', '[]'::jsonb)) s, jsonb_array_elements(coalesce(s -> 'items', '[]'::jsonb)) it,
             jsonb_array_elements(v_nodos) n
       where it ->> 'tipo' = 'atajos' and n ->> 'id' = it ->> 'nodo' and n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (it ->> 'columna') is not null
    ) x where c is not null;
    if v_permitidas is null then
      raise exception 'No tienes acceso a esa tabla.' using errcode = '42501';
    end if;
  end if;

  -- La congelada de esa versión manda, aunque esté vacía; si no, la viva del origen y, si no hay una activa, la compartida.
  v_congelada := case when jsonb_typeof(v_par -> 'tablas') = 'object' and v_par -> 'tablas' ? p_tabla then v_par -> 'tablas' -> p_tabla end;
  select r.* into v_tabla from public.tablas_referencia r where r.origen_id = v_origen and r.clave = p_tabla and r.activa;
  if v_tabla.id is null then
    select r.* into v_tabla from public.tablas_referencia r where r.origen_id is null and r.clave = p_tabla and r.activa;
  end if;
  if v_congelada is null and v_tabla.id is null then
    raise exception 'No tienes acceso a esa tabla.' using errcode = '42501';
  end if;
  if v_congelada is not null and jsonb_typeof(v_congelada) = 'array' then
    v_filas := coalesce((select jsonb_agg(f.value order by f.ord) from jsonb_array_elements(v_congelada) with ordinality f (value, ord) where f.ord <= 1000), '[]'::jsonb);
    v_hay := jsonb_array_length(v_congelada) > 1000;
  else
    select coalesce(jsonb_agg(x.valores order by x.orden, x.id), '[]'::jsonb), coalesce(count(*) > 1000, false) into v_filas, v_hay
      from (select f.valores, f.orden, f.id from public.tablas_referencia_filas f where f.tabla_id = v_tabla.id and f.activa order by f.orden, f.id limit 1001) x;
    if v_hay then v_filas := v_filas - 1000; end if;
  end if;
  v_cols := coalesce(v_tabla.columnas, '[]'::jsonb);
  if not v_cfg then
    v_filas := coalesce((select jsonb_agg((select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(case when jsonb_typeof(f.value) = 'object' then f.value else '{}'::jsonb end) e where v_permitidas ? e.key) order by f.ord)
                           from jsonb_array_elements(v_filas) with ordinality f (value, ord)), '[]'::jsonb);
    v_cols := coalesce((select jsonb_agg(c order by o) from jsonb_array_elements(v_cols) with ordinality t (c, o) where v_permitidas ? (c ->> 'clave')), '[]'::jsonb);
  end if;
  return jsonb_build_object('clave', p_tabla, 'nombre', coalesce(v_tabla.nombre, p_tabla), 'columnas', v_cols, 'filas', v_filas, 'hay_mas', v_hay, 'congelada', v_congelada is not null);
end $$;
revoke all on function public.cotizacion_tabla(text, uuid, uuid) from public, anon;
grant execute on function public.cotizacion_tabla(text, uuid, uuid) to authenticated;
comment on function public.cotizacion_tabla(text, uuid, uuid) is
  'Una tabla de referencia con sólo las columnas que leen los nodos que quien llama ve (la entera, a quien configura el origen); la copia congelada de la versión manda. Sin acceso, el error de una tabla que no existe. docs/COTIZADOR.md › «En la base (4.10-1)».';

update public.permisos set aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla' where clave = 'cotizaciones.ver';
update public.permisos set aplicado_en = 'formula_*, plantilla_*, tono_*, formula_para_cotizar, policy tablas_referencia' where clave = 'cotizaciones.configurar';
