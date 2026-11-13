-- Actividad: `formulas` pasa de «configuración» a «entidad» (paso 9.01-1, auditoría del informe). Su policy «formulas: leer» no es `using (true)`:
-- pide `cotizaciones.configurar` en el origen. Como configuración, quien tenía `actividad.ver` sin ese permiso leía nota, versión, estado y quién
-- publicó (lo oculto ya lo quita `formula_auditar`). Ahora el recorte espeja la policy sobre la foto o la fila vigente. Los grants no cambian.

create or replace function public._actividad_recorte(p_tabla text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case
    when p_tabla = 'leads' then 'lead'
    when p_tabla in ('vehiculos', 'cotizaciones', 'comprobantes', 'declaraciones_aduana', 'documentos', 'gastos', 'pagos', 'transportes',
                     'repuestos_compras', 'repuestos_items', 'formulas') then 'entidad'
    when p_tabla in ('ajustes_empresa', 'ajustes_web', 'ajustes_leads', 'categorias', 'cola_web_asesores', 'fases', 'fases_requisitos',
                     'fases_transiciones', 'integraciones', 'leads_campos', 'origenes', 'origenes_campos', 'origenes_lead',
                     'plantillas_tarjeta', 'roles_permisos', 'tipos_cambio', 'tipos_lead', 'tipos_seguimiento', 'usuarios_roles') then 'configuracion'
  end;
$$;

create or replace function public._actividad_puede_ver_fila(p_tabla text, p_registro text, p_fila jsonb) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_id uuid;
  v_fila jsonb := p_fila;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := p_registro::uuid;
  if v_fila is null and p_tabla in ('comprobantes', 'documentos', 'formulas', 'gastos', 'pagos', 'transportes') then
    -- Cada una por su PK.
    v_fila := case p_tabla
      when 'comprobantes' then (select to_jsonb(t) from public.comprobantes t where t.id = v_id)
      when 'documentos' then (select to_jsonb(t) from public.documentos t where t.id = v_id)
      when 'formulas' then (select to_jsonb(t) from public.formulas t where t.id = v_id)
      when 'gastos' then (select to_jsonb(t) from public.gastos t where t.id = v_id)
      when 'pagos' then (select to_jsonb(t) from public.pagos t where t.id = v_id)
      when 'transportes' then (select to_jsonb(t) from public.transportes t where t.id = v_id)
    end;
    if v_fila is null then
      return false;
    end if;
  end if;
  return coalesce(case p_tabla
    -- policy «vehiculos: leer» / «cotizaciones: leer»: la fila propia, por su id.
    when 'vehiculos' then public.puede_vehiculo(v_id, 'vehiculos.ver')
    when 'cotizaciones' then public.puede_cotizacion(v_id, 'cotizaciones.ver')
    when 'comprobantes' then public.puede_cotizacion((v_fila ->> 'cotizacion_id')::uuid, 'cotizaciones.ver')
    when 'documentos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'gastos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.gastos.ver', 'repuestos.costos.ver')
    when 'transportes' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'pagos' then ((v_fila ->> 'vehiculo_id') is not null and public.puede_vehiculo((v_fila ->> 'vehiculo_id')::uuid, 'logistica.pagos.ver'))
                   or ((v_fila ->> 'proyecto_repuestos_id') is not null and public.tiene_permiso('repuestos.costos.ver'))
    -- policy «formulas: leer»: el origen con cotizaciones.configurar (propios o más).
    when 'formulas' then (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('cotizaciones.configurar', 'propios'))
    when 'repuestos_compras' then public.tiene_permiso('repuestos.costos.ver')
    when 'repuestos_items' then public.tiene_permiso('repuestos.ver')
    -- policy «declaraciones_aduana: leer» (6.07-3): quien gestiona aduana, o un vehículo vigente de la declaración que se ve.
    when 'declaraciones_aduana' then public.tiene_permiso('logistica.aduana.gestionar')
      or exists (select 1 from public.declaraciones_vehiculos dv
                  where dv.declaracion_id = v_id and dv.removido_en is null and public.puede_vehiculo(dv.vehiculo_id, 'logistica.ver'))
  end, false);
end;
$$;
