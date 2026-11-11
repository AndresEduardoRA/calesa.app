-- Pagos: la lista por cursor, con el alcance resuelto una vez (paso 6.10-2, C9).
--   Como `gastos_listar`: sólo pagos de vehículos vivos (D4), `logistica.pagos.ver` con su alcance resuelto una vez (sin la clave, vacía, D6), orden
--   `(fecha desc, id desc)` por `pagos_fecha_idx`, tope `_acotar_pagina(p_tope, 50, 100) + 1` y sin total. Filtros `origen`, `desde`, `hasta` y
--   `sin_confirmar`. No devuelve el lead ni las notas (D7).

create index pagos_fecha_idx on public.pagos (fecha desc, id desc) where eliminado_en is null;

create function public.pagos_listar(p_cursor_fecha date, p_cursor_id uuid, p_tope integer, p_filtros jsonb)
returns table (id uuid, vehiculo_id uuid, vehiculo_titulo text, origen_id uuid, concepto text, moneda text, monto numeric, tipo_cambio_aplicado numeric,
               monto_base numeric, metodo text, fecha date, confirmado boolean, confirmado_por uuid, confirmado_en timestamptz, comprobante_ruta text,
               actualizado_en timestamptz)
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
  select * into f from public._dinero_filtros(p_filtros, array['origen', 'desde', 'hasta', 'sin_confirmar']);
  if (p_cursor_fecha is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_todos := public.origenes_con_alcance('logistica.pagos.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.pagos.ver', 'propios');
  if cardinality(v_algun) = 0 then
    return;
  end if;
  -- pagos_fecha_idx: (fecha desc, id desc) where eliminado_en is null. Sin cursor, el tope es (infinity, el uuid más alto), como en gastos_listar.
  return query
    select p.id, p.vehiculo_id, v.titulo, v.origen_id, p.concepto, p.moneda::text, p.monto, p.tipo_cambio_aplicado, p.monto_base, p.metodo, p.fecha,
           p.confirmado, p.confirmado_por, p.confirmado_en, p.comprobante_ruta, p.actualizado_en
      from public.pagos p
      join public.vehiculos v on v.id = p.vehiculo_id and v.eliminado_en is null
     where p.eliminado_en is null
       and (p.fecha, p.id) < (coalesce(p_cursor_fecha, 'infinity'::date), coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
       and v.origen_id = any (v_algun)
       and (v.origen_id = any (v_todos) or v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       and (f.origen is null or v.origen_id = f.origen)
       and (f.desde is null or p.fecha >= f.desde)
       and (f.hasta is null or p.fecha <= f.hasta)
       and (f.sin_confirmar is not true or not p.confirmado)
     order by p.fecha desc, p.id desc
     limit v_n;
end;
$$;

comment on function public.pagos_listar(date, uuid, integer, jsonb) is 'Los pagos de vehículos que quien llama ve (logistica.pagos.ver con su alcance), por cursor (fecha desc, id desc), con filtros origen, desde, hasta y sin_confirmar. Devuelve hasta el tope más una (hay otra página). Sin la clave, vacía. Sin lead, sin notas, sin total (6.10-2, C9).';
revoke all on function public.pagos_listar(date, uuid, integer, jsonb) from public, anon;
grant execute on function public.pagos_listar(date, uuid, integer, jsonb) to authenticated, service_role;

update public.permisos set aplicado_en = 'policy pagos, comprobante_puede, pagos_listar' where clave = 'logistica.pagos.ver';
