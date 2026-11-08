-- Ordenar los candados de reportar y moderar (4.27-1, auditoría del informe).
--
-- `cotizacion_reporte_retirar` borraba el reporte y el trigger de contadores tomaba después la cotización; `cotizacion_moderar` toma la cotización y
-- después borra los reportes: en orden cruzado, una de las dos caía con 40P01. Ahora retirar toma la cotización antes del reporte (cotización →
-- reporte, como moderar). Y moderar mira el permiso global antes de tomar la fila. Lo demás no cambia (firma, textos, grants y comentario).

create or replace function public.cotizacion_reporte_retirar(p_cotizacion uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- La cotización antes que el reporte, como moderar: el trigger de contadores la toma de todos modos al borrar.
  perform 1 from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null for no key update;
  delete from public.cotizaciones_reportes r where r.cotizacion_id = p_cotizacion and r.usuario_id = (select auth.uid());
  return jsonb_build_object('resultado', case when found then 'retirado' else 'sin_cambios' end);
end $$;

create or replace function public.cotizacion_moderar(p_cotizacion uuid, p_actualizado_en_esperado timestamptz, p_estado public.estado_cotizacion) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c record;
  v_puede_final boolean;
begin
  perform public.assert_activo();
  -- Ver antes de tomar la fila, y otra vez con la fila tomada.
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- Moderar es global: se mira antes de tomar la fila, para no dejarla tomada a quien no puede. `final.gestionar` es del origen: después.
  if not public.tiene_permiso('cotizaciones.moderar') then
    raise exception 'No tienes permiso para moderar esta cotización.' using errcode = '42501';
  end if;
  select x.id, x.clase, x.origen_id, x.estado, x.actualizado_en, x.reportes_count into c
    from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null for no key update;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  v_puede_final := c.clase <> 'final' or public.tiene_permiso('cotizaciones.final.gestionar', c.origen_id);
  if not public.tiene_permiso('cotizaciones.moderar') or not v_puede_final then
    raise exception 'No tienes permiso para moderar esta cotización.' using errcode = '42501';
  end if;
  if p_estado is null or p_estado = 'reportada' then
    raise exception 'Elige invalidarla o descartar sus reportes.' using errcode = '22023', hint = 'estado';
  end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado,
                                 'Alguien cambió esta cotización mientras la mirabas. Recarga e intenta de nuevo.');
  -- Nada que hacer: el mismo estado y, si se pide activa, sin reportes que descartar.
  if p_estado = c.estado and (p_estado <> 'activa' or c.reportes_count = 0) then
    return jsonb_build_object('resultado', 'sin_cambios', 'estado', c.estado, 'actualizado_en', c.actualizado_en);
  end if;
  if p_estado = 'activa' then
    delete from public.cotizaciones_reportes r where r.cotizacion_id = c.id;
  end if;
  if p_estado <> c.estado then
    update public.cotizaciones x set estado = p_estado where x.id = c.id;
  end if;
  perform public.registrar_actividad('cotizacion.moderada', 'cotizaciones', c.id::text, null,
                                     jsonb_build_object('estado', p_estado, 'reportes', c.reportes_count));
  return (select jsonb_build_object('resultado', 'moderada', 'estado', x.estado, 'actualizado_en', x.actualizado_en)
            from public.cotizaciones x where x.id = c.id);
end $$;
