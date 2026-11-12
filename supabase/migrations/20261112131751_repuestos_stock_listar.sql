-- El stock de repuestos por cursor (paso 8.10-1, C4).
--   · Índice parcial `repuestos_items_en_stock_idx (en_stock_desde desc, id desc)` sólo de los ítems vivos en stock.
--   · `repuestos_stock_listar(cursor_en, cursor_id, tamaño)`: los dos tramos del cursor o ninguno; sin `repuestos.ver`, ninguna fila. Orden
--     `en_stock_desde desc, id desc`; con cursor y sin cursor son dos consultas. Trae la página más una. Ningún costo ni precio.
--   · `vehiculo_titulo` sólo si quien lee ve el vehículo. Un ítem vivo nunca cuelga de un proyecto eliminado (se elimina sólo vacío): el `join` no
--     descarta filas.

create index repuestos_items_en_stock_idx on public.repuestos_items (en_stock_desde desc, id desc)
  where en_stock_desde is not null and eliminado_en is null;

create function public.repuestos_stock_listar(p_cursor_en timestamptz, p_cursor_id uuid, p_tamano integer)
returns table (id uuid, descripcion text, stock_cantidad integer, en_stock_desde timestamptz, proyecto_id uuid, proyecto_numero bigint,
               proyecto_cerrado_en timestamptz, vehiculo_id uuid, vehiculo_titulo text, vehiculo_etiqueta text)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
  v_ids uuid[];
begin
  perform public.assert_activo();
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de la lista no es válido.' using errcode = '22023', hint = 'cursor';
  end if;
  if not public.tiene_permiso('repuestos.ver') then
    return;
  end if;

  -- repuestos_items_en_stock_idx: (en_stock_desde desc, id desc) where en_stock_desde is not null and eliminado_en is null.
  if p_cursor_en is null then
    select array_agg(x.id order by x.en_stock_desde desc, x.id desc) into v_ids
    from (
      select i.id, i.en_stock_desde from public.repuestos_items i
      where i.en_stock_desde is not null and i.eliminado_en is null
      order by i.en_stock_desde desc, i.id desc
      limit v_n
    ) x;
  else
    select array_agg(x.id order by x.en_stock_desde desc, x.id desc) into v_ids
    from (
      select i.id, i.en_stock_desde from public.repuestos_items i
      where i.en_stock_desde is not null and i.eliminado_en is null
        and (i.en_stock_desde, i.id) < (p_cursor_en, p_cursor_id)
      order by i.en_stock_desde desc, i.id desc
      limit v_n
    ) x;
  end if;
  if v_ids is null then
    return;
  end if;

  return query
    select i.id, i.descripcion, i.stock_cantidad, i.en_stock_desde, p.id, p.numero, p.cerrado_en, p.vehiculo_id,
           case when p.vehiculo_id is not null and public.puede_vehiculo(p.vehiculo_id, 'vehiculos.ver') then v.titulo end,
           p.vehiculo_etiqueta
      from unnest(v_ids) with ordinality as u(id, n)
      join public.repuestos_items i on i.id = u.id
      join public.repuestos_proyectos p on p.id = i.proyecto_id
      left join public.vehiculos v on v.id = p.vehiculo_id
     order by u.n;
end;
$$;

comment on function public.repuestos_stock_listar(timestamptz, uuid, integer) is
  'El stock de repuestos (8.10-1, C4): ítems vivos en stock por cursor (en_stock_desde desc, id desc), la página más una; vacía sin repuestos.ver.';
revoke all on function public.repuestos_stock_listar(timestamptz, uuid, integer) from public, anon;
grant execute on function public.repuestos_stock_listar(timestamptz, uuid, integer) to authenticated, service_role;
