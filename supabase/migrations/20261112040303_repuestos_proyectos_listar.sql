-- La lista de proyectos de repuestos por cursor, con las cuentas de sus ítems (paso 8.08-1, C9).
--   · Sin `repuestos.ver`, ninguna fila. Sólo proyectos vivos: la función es `definer` y la policy que esconde los eliminados no corre aquí.
--   · `p_estado`: nulo, `abiertos` o `cerrados`. `p_q` (tras recortar): sólo dígitos (hasta 18) busca el número o el texto; si no, con menos de 3
--     caracteres se ignora y con 3 o más busca, escapado, en la etiqueta, el VIN y el cliente. No busca en el título del vehículo, que no todos ven.
--   · Orden `numero desc` por `repuestos_proyectos_numero_key`; con cursor y sin cursor son dos consultas. Trae la página más una.
--   · `vehiculo_titulo` sólo si quien lee ve el vehículo. No devuelve el teléfono del cliente ni a quién está vinculado.
--   · Las cuentas leen como mucho 201 ítems vivos por proyecto (`repuestos_items_proyecto_id_idx`): un número que se muestra nunca es un total exacto.
--     `terminados` = en fase final y fuera de stock; `pendientes` = el resto fuera de stock.

create function public.repuestos_proyectos_listar(p_cursor bigint, p_tamano integer, p_q text, p_estado text)
returns table (id uuid, numero bigint, vehiculo_id uuid, vehiculo_titulo text, vehiculo_etiqueta text, vin text, cliente_nombre text,
               cerrado_en timestamptz, items integer, pendientes integer, en_stock integer, terminados integer, ultima_actividad timestamptz,
               actualizado_en timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 50, 100) + 1;
  v_q text := nullif(btrim(p_q), '');
  v_numero bigint;
  v_patron text;
  v_ids uuid[];
begin
  perform public.assert_activo();
  if p_estado is not null and p_estado not in ('abiertos', 'cerrados') then
    raise exception 'El estado de la lista no es válido.' using errcode = '22023', hint = 'estado';
  end if;
  if not public.tiene_permiso('repuestos.ver') then
    return;
  end if;
  if v_q ~ '^[0-9]{1,18}$' then
    v_numero := v_q::bigint;
  end if;
  if v_q is not null and (v_numero is not null or char_length(v_q) >= 3) then
    v_patron := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  -- repuestos_proyectos_numero_key: (numero). El cursor queda como condición de índice; estado y texto, como filtro.
  if p_cursor is null then
    select array_agg(x.id order by x.numero desc) into v_ids
    from (
      select p.id, p.numero from public.repuestos_proyectos p
      where p.eliminado_en is null
        and (p_estado is null or (p_estado = 'cerrados') = (p.cerrado_en is not null))
        and (v_patron is null or p.numero = v_numero or p.vehiculo_etiqueta ilike v_patron or p.vin ilike v_patron or p.cliente_nombre ilike v_patron)
      order by p.numero desc
      limit v_n
    ) x;
  else
    select array_agg(x.id order by x.numero desc) into v_ids
    from (
      select p.id, p.numero from public.repuestos_proyectos p
      where p.numero < p_cursor and p.eliminado_en is null
        and (p_estado is null or (p_estado = 'cerrados') = (p.cerrado_en is not null))
        and (v_patron is null or p.numero = v_numero or p.vehiculo_etiqueta ilike v_patron or p.vin ilike v_patron or p.cliente_nombre ilike v_patron)
      order by p.numero desc
      limit v_n
    ) x;
  end if;
  if v_ids is null then
    return;
  end if;

  return query
    select p.id, p.numero, p.vehiculo_id,
           case when p.vehiculo_id is not null and public.puede_vehiculo(p.vehiculo_id, 'vehiculos.ver') then v.titulo end,
           p.vehiculo_etiqueta, p.vin, p.cliente_nombre, p.cerrado_en,
           coalesce(c.items, 0)::integer,
           (coalesce(c.items, 0) - coalesce(c.en_stock, 0) - coalesce(c.terminados, 0))::integer,
           coalesce(c.en_stock, 0)::integer,
           coalesce(c.terminados, 0)::integer,
           greatest(p.actualizado_en, c.ultima),
           p.actualizado_en
      from unnest(v_ids) with ordinality as u(id, n)
      join public.repuestos_proyectos p on p.id = u.id
      left join public.vehiculos v on v.id = p.vehiculo_id
      left join lateral (
        select count(*) as items,
               count(*) filter (where i.en_stock_desde is not null) as en_stock,
               count(*) filter (where i.en_stock_desde is null and f.es_final) as terminados,
               max(i.actualizado_en) as ultima
          from (select i2.fase_id, i2.en_stock_desde, i2.actualizado_en
                  from public.repuestos_items i2
                 where i2.proyecto_id = p.id and i2.eliminado_en is null
                 limit 201) i
          left join public.fases f on f.id = i.fase_id
      ) c on true
     order by u.n;
end;
$$;

comment on function public.repuestos_proyectos_listar(bigint, integer, text, text) is
  'La lista de proyectos de repuestos (8.08-1, C9): por cursor sobre numero desc, sólo vivos, con las cuentas de hasta 201 ítems por proyecto; vacía sin repuestos.ver.';
revoke all on function public.repuestos_proyectos_listar(bigint, integer, text, text) from public, anon;
grant execute on function public.repuestos_proyectos_listar(bigint, integer, text, text) to authenticated, service_role;
