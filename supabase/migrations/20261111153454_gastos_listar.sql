-- Gastos: la lista por cursor, con el alcance resuelto una vez (paso 6.10-2, C5–C8).
--   C5. `_dinero_filtros(filtros, claves)`: los filtros de las listas de gastos y pagos son una lista cerrada; una clave de más o un valor mal escrito da
--       22023 con la clave en el hint (nunca 22P02).
--   C6. `gastos_listar(cursor_fecha, cursor_id, tope, filtros)`: sólo gastos de vehículos vivos (D4); los dos tramos del cursor o ninguno.
--   C7. El alcance de `logistica.gastos.ver` se resuelve una vez (`origenes_con_alcance`), no por fila: es lo de `puede_vehiculo`. Sin la clave, vacía (D6).
--   C8. Orden `(fecha desc, id desc)` por `gastos_fecha_idx`; tope `_acotar_pagina(p_tope, 50, 100) + 1` (una de más: hay otra página, D5). Sin total.

create function public._dinero_filtros(p_filtros jsonb, p_claves text[], out origen uuid, out categoria uuid, out desde date, out hasta date,
  out sin_confirmar boolean)
language plpgsql stable
set search_path = ''
as $$
declare k text;
begin
  if p_filtros is null or p_filtros = '{}'::jsonb then
    return;
  end if;
  if jsonb_typeof(p_filtros) <> 'object' then
    raise exception 'Los filtros no se entienden.' using errcode = '22023', hint = 'filtros';
  end if;
  for k in select jsonb_object_keys(p_filtros) loop
    if not k = any (p_claves) then
      raise exception 'No se filtra por «%».', k using errcode = '22023', hint = k;
    end if;
    begin
      case k
        when 'origen' then origen := (p_filtros ->> k)::uuid;
        when 'categoria' then categoria := (p_filtros ->> k)::uuid;
        when 'desde' then desde := (p_filtros ->> k)::date;
        when 'hasta' then hasta := (p_filtros ->> k)::date;
        when 'sin_confirmar' then sin_confirmar := (p_filtros ->> k)::boolean;
      end case;
    exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
      raise exception 'El filtro «%» no tiene un valor válido.', k using errcode = '22023', hint = k;
    end;
  end loop;
  if desde > hasta then
    raise exception '«Desde» no puede ser después de «hasta».' using errcode = '22023', hint = 'hasta';
  end if;
end;
$$;

comment on function public._dinero_filtros(jsonb, text[]) is 'Lee los filtros de gastos_listar y pagos_listar: sólo las claves de p_claves; un valor mal escrito o desde > hasta da 22023 con la clave en el hint (6.10-2, C5).';
revoke all on function public._dinero_filtros(jsonb, text[]) from public, anon, authenticated;
grant execute on function public._dinero_filtros(jsonb, text[]) to service_role;

create index gastos_fecha_idx on public.gastos (fecha desc, id desc) where eliminado_en is null;

create function public.gastos_listar(p_cursor_fecha date, p_cursor_id uuid, p_tope integer, p_filtros jsonb)
returns table (id uuid, vehiculo_id uuid, vehiculo_titulo text, origen_id uuid, categoria_id uuid, categoria_nombre text, moneda text, monto numeric,
               tipo_cambio_aplicado numeric, monto_base numeric, fecha date, proveedor text, comprobante_ruta text, lote_id uuid, actualizado_en timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tope, 50, 100) + 1;
  v_yo uuid := (select auth.uid());
  f record;
  v_todos uuid[]; v_algun uuid[];
begin
  perform public.assert_activo();
  select * into f from public._dinero_filtros(p_filtros, array['origen', 'categoria', 'desde', 'hasta']);
  if (p_cursor_fecha is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_todos := public.origenes_con_alcance('logistica.gastos.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.gastos.ver', 'propios');
  if cardinality(v_algun) = 0 then
    return;
  end if;
  -- gastos_fecha_idx: (fecha desc, id desc) where eliminado_en is null. Sin cursor, el tope es (infinity, el uuid más alto): una sola consulta y el
  -- mismo recorrido del índice, sin un `p_cursor is null or …` que lo esconda.
  return query
    select g.id, g.vehiculo_id, v.titulo, v.origen_id, g.categoria_id, c.nombre, g.moneda::text, g.monto, g.tipo_cambio_aplicado, g.monto_base, g.fecha,
           g.proveedor, g.comprobante_ruta, g.lote_id, g.actualizado_en
      from public.gastos g
      join public.vehiculos v on v.id = g.vehiculo_id and v.eliminado_en is null
      join public.categorias_gasto c on c.id = g.categoria_id
     where g.eliminado_en is null
       and (g.fecha, g.id) < (coalesce(p_cursor_fecha, 'infinity'::date), coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
       and v.origen_id = any (v_algun)
       and (v.origen_id = any (v_todos) or v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       and (f.origen is null or v.origen_id = f.origen)
       and (f.categoria is null or g.categoria_id = f.categoria)
       and (f.desde is null or g.fecha >= f.desde)
       and (f.hasta is null or g.fecha <= f.hasta)
     order by g.fecha desc, g.id desc
     limit v_n;
end;
$$;

comment on function public.gastos_listar(date, uuid, integer, jsonb) is 'Los gastos de vehículos que quien llama ve (logistica.gastos.ver con su alcance), por cursor (fecha desc, id desc), con filtros origen, categoria, desde y hasta. Devuelve hasta el tope más una (hay otra página). Sin la clave, vacía. Sin total (6.10-2, C5–C8).';
revoke all on function public.gastos_listar(date, uuid, integer, jsonb) from public, anon;
grant execute on function public.gastos_listar(date, uuid, integer, jsonb) to authenticated, service_role;

update public.permisos set aplicado_en = 'policy gastos, comprobante_puede, gastos_listar' where clave = 'logistica.gastos.ver';
