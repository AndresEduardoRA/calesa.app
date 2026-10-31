-- La tabla de una ayuda se lee con la versión de la hoja abierta (paso 4.13-4c1): `cotizacion_tabla()` recibe `p_abierta`, como `cotizacion_evaluar`, y por origen
-- lee la versión con que la hoja calcula (su definición, su copia congelada y lo que deja ver), no la publicada de ahora (4-28). Por origen pide `cotizaciones.crear` y
-- `cotizaciones.ver`, la puerta de la hoja (4-32; P4). La versión y la puerta las resuelve `_cotizacion_tabla_version()` (de nadie). La firma de tres se borra: una sola,
-- con los grants de nuevo. docs/COTIZADOR.md › «En la base (4.10-1)» y «La hoja abierta (4.13-3a)».

drop function public.cotizacion_tabla(text, uuid, uuid);

create function public._cotizacion_tabla_version(p_cotizacion uuid, p_origen uuid, p_abierta text) returns uuid
    language plpgsql stable security definer
    set search_path to ''
    as $$
declare
  v_formula uuid; v_abierta_en timestamptz; v_publicada uuid;
begin
  perform public.assert_activo();
  -- La hoja abierta es de una hoja nueva (por origen), y eso se dice antes que «una cotización o un origen».
  if p_abierta is not null and p_cotizacion is not null then
    perform public._motor_fallar('llamada_invalida', 'p_abierta', 'Una cotización ya trae su versión de la hoja.');
  end if;
  if (p_cotizacion is null) = (p_origen is null) then
    raise exception 'Pide una cotización o un origen, y no los dos ni ninguno.' using errcode = '22023';
  end if;
  if p_cotizacion is not null then
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    return (select c.formula_id from public.cotizaciones c where c.id = p_cotizacion);
  end if;
  -- Por origen, la puerta de la hoja (`crear` y `ver`), antes de leer la hoja abierta y de mirar nada más.
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  select f.id into v_publicada from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';       -- formulas_publicada_unica
  if p_abierta is null then
    return v_publicada;
  end if;
  select l.formula_id, l.abierta_en into v_formula, v_abierta_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;
  -- Una versión que ya no es la publicada vale mientras se podría guardar con ella; si no, «abierta_vencida» y la hoja pide recargar.
  if v_formula is distinct from v_publicada then
    perform public._cotizacion_abierta(p_origen, v_formula, v_abierta_en);
  end if;
  return v_formula;
end $$;

revoke all on function public._cotizacion_tabla_version(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public._cotizacion_tabla_version(uuid, uuid, text) to service_role;

comment on function public._cotizacion_tabla_version(uuid, uuid, text) is 'La versión de la fórmula de la que cotizacion_tabla lee una tabla: la de la cotización (con cotizaciones.ver de ella), la de la hoja abierta (p_abierta, validada con _cotizacion_abierta_leer y _cotizacion_abierta) o la publicada del origen (nula si no hay); por origen pide cotizaciones.crear y cotizaciones.ver antes de mirar nada. De nadie; la llama cotizacion_tabla. docs/COTIZADOR.md › «La hoja abierta (4.13-3a)».';

create function public.cotizacion_tabla(p_tabla text, p_cotizacion uuid default null, p_origen uuid default null, p_abierta text default null) returns jsonb
    language plpgsql stable security definer
    set search_path to ''
    as $$
declare
  v_formula uuid; v_origen uuid; v_def jsonb; v_par jsonb; v_diseno jsonb; v_cfg boolean; v_visibles text[]; v_vis jsonb;
  v_tabla public.tablas_referencia; v_congelada jsonb; v_permitidas jsonb; v_filas jsonb; v_cols jsonb; v_hay boolean := false; v_nodos jsonb;
begin
  -- La versión (la de la cotización, la de la hoja abierta o la publicada) y la puerta. Sin publicada, el origen sigue siendo el pedido (no se cae a la compartida).
  v_formula := public._cotizacion_tabla_version(p_cotizacion, p_origen, p_abierta);
  v_origen := coalesce(p_origen, (select c.origen_id from public.cotizaciones c where c.id = p_cotizacion));
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

revoke all on function public.cotizacion_tabla(text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cotizacion_tabla(text, uuid, uuid, text) to authenticated, service_role;

comment on function public.cotizacion_tabla(text, uuid, uuid, text) is 'Una tabla de referencia con sólo las columnas que leen los nodos que quien llama ve (la entera, a quien configura el origen); la copia congelada de la versión manda. La versión es la de la cotización, la de la hoja abierta (p_abierta, por origen) o la publicada; por origen pide cotizaciones.crear y cotizaciones.ver. Sin acceso, el error de una tabla que no existe. docs/COTIZADOR.md › «En la base (4.10-1)» y «La hoja abierta (4.13-3a)».';

comment on function public._cotizacion_abierta(uuid, uuid, timestamptz) is 'Valida la versión de la hoja abierta para «Guardar con la N» (publicada o archivada de este origen; abierta hace menos de un día y, si ya no es la publicada, reemplazada hace menos de un día). STABLE y sin candado: el for share lo toma cotizacion_crear. De nadie; la llaman cotizacion_crear, cotizacion_evaluar y _cotizacion_tabla_version. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';

comment on function public._cotizacion_abierta_leer(text, uuid) is 'Verifica la hoja abierta de quien llama en ese origen y devuelve la versión de la fórmula y la hora de la apertura; 22023 abierta_invalida si no es la que firmó la base. De nadie; la llaman cotizacion_crear, cotizacion_evaluar y _cotizacion_tabla_version. docs/COTIZADOR.md › «La hoja abierta (4.13-3a)».';

-- Dónde se aplica `cotizaciones.crear` (la nube no vuelve a correr el seed).
update public.permisos set aplicado_en = 'cotizacion_crear, cotizacion_hoja, cotizacion_evaluar, cotizacion_tabla' where clave = 'cotizaciones.crear';
