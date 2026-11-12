-- Los ítems de repuestos que la espera de un vehículo aguarda (paso 8.08-1, C11), para el panel del vehículo de `logistica` (8.13).
--   · Acceso: `repuestos.ver` o `logistica.ver` del vehículo; si no, o si el vehículo no existe o está eliminado, ninguna fila.
--   · Las esperas son los requisitos `espera`/`hijos` de las fases a las que hay transición desde la fase actual del vehículo; sin fase, los de las
--     iniciales activas de su flujo.
--   · Los ítems: vivos, fuera de stock, del proyecto vivo del vehículo, que `_repuesto_ante_espera` da `pendiente` (ni llegaron ni terminaron).
--   · Los nombres de las fases del vehículo (destino y espera) sólo con `logistica.ver` del vehículo: quien sólo ve repuestos no lee su flujo.
--   · Una fila por ítem y requisito, en orden (creado_en, id) del ítem, de a 50 (máximo 200) más una. Un proyecto vivo por vehículo
--     (`repuestos_proyecto_por_vehiculo`) y sus ítems por `repuestos_items_proyecto_id_idx`.

create function public.repuestos_pendientes_de_vehiculo(p_vehiculo uuid, p_tope integer default null)
returns table (item_id uuid, descripcion text, proyecto_id uuid, proyecto_numero bigint, fase_id uuid, fase_nombre text, requisito_id uuid,
               fase_destino_id uuid, fase_destino_nombre text, espera_fase_id uuid, espera_fase_nombre text)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_n integer := public._acotar_pagina(p_tope, 50, 200) + 1;
  v public.vehiculos;
  v_flujo uuid;
  v_ve_flujo boolean;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null;
  if not found then
    return;
  end if;
  v_ve_flujo := public.puede_vehiculo(v.id, 'logistica.ver');
  if not v_ve_flujo and not public.tiene_permiso('repuestos.ver') then
    return;
  end if;
  select fl.id into v_flujo from public.flujos fl where fl.origen_id = v.origen_id and fl.ambito = 'vehiculos';

  return query
    with esperas as (
      select q.id as requisito_id, q.fase_id as destino, q.espera_fase_id
        from public.fases_requisitos q
       where q.tipo = 'espera' and q.espera_ambito = 'hijos'
         and q.fase_id in (
           select t.a_fase_id from public.fases_transiciones t where v.fase_id is not null and t.de_fase_id = v.fase_id
           union
           select fa.id from public.fases fa where v.fase_id is null and fa.flujo_id = v_flujo and fa.es_inicial and fa.activa)
    )
    select i.id, i.descripcion, pr.id, pr.numero, i.fase_id, fi.nombre, e.requisito_id,
           e.destino, case when v_ve_flujo then fd.nombre end,
           e.espera_fase_id, case when v_ve_flujo then fe.nombre end
      from public.repuestos_proyectos pr
      join public.repuestos_items i on i.proyecto_id = pr.id and i.eliminado_en is null and i.en_stock_desde is null
      cross join esperas e
      left join public.fases fi on fi.id = i.fase_id
      left join public.fases fd on fd.id = e.destino
      left join public.fases fe on fe.id = e.espera_fase_id
     where pr.vehiculo_id = v.id and pr.eliminado_en is null
       and public._repuesto_ante_espera(i.id, e.espera_fase_id) = 'pendiente'
     order by i.creado_en, i.id, e.requisito_id
     limit v_n;
end;
$$;

comment on function public.repuestos_pendientes_de_vehiculo(uuid, integer) is
  'Los ítems de repuestos que las esperas de las fases siguientes de un vehículo aguardan (8.08-1, C11): repuestos.ver o logistica.ver del vehículo.';
revoke all on function public.repuestos_pendientes_de_vehiculo(uuid, integer) from public, anon;
grant execute on function public.repuestos_pendientes_de_vehiculo(uuid, integer) to authenticated, service_role;
