-- Reportar una cotización y moderar sus reportes por RPC (4.27-1).
--
-- Reportar suma un reporte por persona, con motivo (1 a 500), y no cambia el estado ni la versión (P6 a: los contadores no la mueven): una cotización
-- «reportada» es una activa con reportes. Moderar resuelve: «Invalidar» (estado `invalida`, mueve la versión, conserva los reportes) o «Descartar los
-- reportes» (`activa`: los borra; si el estado no cambia, la versión tampoco). El valor `reportada` del enum queda sin uso. `cotizacion_moderar`
-- cambia de firma: pide ver, toma la fila, exige la versión y, en una final, `cotizaciones.final.gestionar` del origen (P7 a). Leer los reportes
-- de otras personas pide moderar y ver la cotización (antes alcanzaba moderar, que es global). Se revocan las escrituras directas (P9 a).

drop policy "cotizaciones_reportes: leer" on public.cotizaciones_reportes;
create policy "cotizaciones_reportes: leer" on public.cotizaciones_reportes for select to authenticated
  using (usuario_id = (select auth.uid())
         or ((select public.tiene_permiso('cotizaciones.moderar')) and (select public.puede_cotizacion(cotizaciones_reportes.cotizacion_id, 'cotizaciones.ver'))));

revoke insert, delete on public.cotizaciones_reportes from authenticated;

create function public.cotizacion_reportar(p_cotizacion uuid, p_motivo text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_motivo text := btrim(p_motivo);
  v_nuevo boolean;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if v_motivo is null or char_length(v_motivo) not between 1 and 500 then
    raise exception 'Cuéntanos qué está mal (hasta 500 caracteres).' using errcode = '22023', hint = 'motivo';
  end if;
  -- Uno por persona: el segundo cambia el motivo.
  insert into public.cotizaciones_reportes as r (cotizacion_id, usuario_id, motivo) values (p_cotizacion, v_yo, v_motivo)
  on conflict (cotizacion_id, usuario_id) do update set motivo = excluded.motivo where r.motivo is distinct from excluded.motivo
  returning (xmax = 0) into v_nuevo;
  return jsonb_build_object('resultado', case when v_nuevo is null then 'sin_cambios' when v_nuevo then 'reportada' else 'motivo_cambiado' end);
end $$;

comment on function public.cotizacion_reportar(uuid, text) is 'Reporta una cotización con un motivo (1 a 500 caracteres; 22023, hint motivo). Pide cotizaciones.ver (42501). Uno por persona: el segundo cambia el motivo. No cambia el estado ni la versión. {resultado: reportada | motivo_cambiado | sin_cambios}. 4.27-1.';
revoke all on function public.cotizacion_reportar(uuid, text) from public, anon;
grant execute on function public.cotizacion_reportar(uuid, text) to authenticated, service_role;

create function public.cotizacion_reporte_retirar(p_cotizacion uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  delete from public.cotizaciones_reportes r where r.cotizacion_id = p_cotizacion and r.usuario_id = (select auth.uid());
  return jsonb_build_object('resultado', case when found then 'retirado' else 'sin_cambios' end);
end $$;

comment on function public.cotizacion_reporte_retirar(uuid) is 'Retira el reporte propio de una cotización. Pide cotizaciones.ver (42501). {resultado: retirado | sin_cambios}. 4.27-1.';
revoke all on function public.cotizacion_reporte_retirar(uuid) from public, anon;
grant execute on function public.cotizacion_reporte_retirar(uuid) to authenticated, service_role;

drop function public.cotizacion_moderar(uuid, public.estado_cotizacion);

create function public.cotizacion_moderar(p_cotizacion uuid, p_actualizado_en_esperado timestamptz, p_estado public.estado_cotizacion) returns jsonb
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

comment on function public.cotizacion_moderar(uuid, timestamptz, public.estado_cotizacion) is 'Modera una cotización: invalida (mueve la versión y conserva los reportes) o activa (descarta los reportes; la versión se mueve sólo si cambia el estado). Pide ver (42501, también si no existe o está en la papelera), cotizaciones.moderar y, en una final, cotizaciones.final.gestionar del origen (42501 «No tienes permiso para moderar…»); la versión (PT409); reportada no se pide (22023, hint estado). Deja cotizacion.moderada en la actividad. {resultado: moderada | sin_cambios, estado, actualizado_en}. 4.27-1.';
revoke all on function public.cotizacion_moderar(uuid, timestamptz, public.estado_cotizacion) from public, anon;
grant execute on function public.cotizacion_moderar(uuid, timestamptz, public.estado_cotizacion) to authenticated, service_role;

update public.permisos set
  aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_hoja_guardada, cotizacion_crear, cotizacion_encima, cotizacion_guardar, cotizacion_comentarios, cotizacion_comentar, cotizacion_reportar'
 where clave = 'cotizaciones.ver';
update public.permisos set
  descripcion = 'Invalidar, descartar reportes, borrar comentarios y quitar adjuntos ajenos',
  aplicado_en = 'cotizacion_moderar, cotizacion_comentario_borrar, cotizacion_adjunto_quitar, policy cotizaciones_reportes: leer'
 where clave = 'cotizaciones.moderar';
