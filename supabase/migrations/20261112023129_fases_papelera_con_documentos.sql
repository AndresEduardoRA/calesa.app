-- Un vehículo con documentos no va a la papelera (paso 6.02-1, C10; el arrastre de ESTADO «la papelera manual no mira `documentos`»). Sólo al enviar
-- (`p_al_enviar`: enviar a mano y la limpieza, `_limpieza_ancla`); la purga sigue igual. Vivos de cualquier estado (subido, aprobado, rechazado,
-- pendiente): «documentos cargados» es que alguien los cargó. Lo usa el índice `documentos_vehiculo_id_idx`.

create or replace function public._vehiculo_motivo_de_bloqueo(v public.vehiculos, p_al_enviar boolean) returns text
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare v_fase public.fases;
begin
  if v.lead_id is not null then
    return 'Está vinculado a un lead. Quita el vínculo antes.';
  end if;
  if p_al_enviar and v.fase_id is not null then
    select * into v_fase from public.fases f where f.id = v.fase_id;
    if not v_fase.es_inicial then
      return format('Está en «%s». Sólo va a la papelera lo que sigue en su fase inicial.', v_fase.nombre);
    end if;
  end if;
  if exists (select 1 from public.comprobantes cp join public.cotizaciones c on c.id = cp.cotizacion_id where c.vehiculo_id = v.id) then
    return 'Tiene un comprobante emitido.';
  end if;
  -- Enviar a la papelera (y la limpieza, que pregunta con p_al_enviar) frena con documentos vivos: los cargó alguien y son de la logística. La purga
  -- de lo que ya está en la papelera no frena: junta sus rutas y las encola para limpiar (`_papelera_purgar_vehiculos`), como siempre.
  if p_al_enviar and exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.eliminado_en is null) then
    return 'Tiene documentos cargados.';
  end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) or exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then
    return 'Tiene pagos o gastos registrados.';
  end if;
  if exists (select 1 from public.declaraciones_vehiculos d where d.vehiculo_id = v.id and d.removido_en is null) then
    return 'Está en una declaración aduanera.';
  end if;
  if exists (select 1 from public.repuestos_proyectos r where r.vehiculo_id = v.id and r.eliminado_en is null) then
    return 'Tiene un proyecto de repuestos.';
  end if;
  return null;
end;
$$;

revoke all on function public._vehiculo_motivo_de_bloqueo(public.vehiculos, boolean) from public, anon, authenticated;
grant execute on function public._vehiculo_motivo_de_bloqueo(public.vehiculos, boolean) to service_role;
