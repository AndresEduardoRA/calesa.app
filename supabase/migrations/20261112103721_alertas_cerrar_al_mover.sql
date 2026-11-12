-- Cerrar las alertas de demora al mover la unidad (paso 6.12-1, C1 y C2).
--
-- `notificaciones_referencia_idx`: «ya avisé» (alertas_demora, documentos_vencimientos) y «cerrar al mover» buscan los avisos de una unidad o de un
-- documento, y el antispam (`notificaciones_antispam`) empieza por `usuario_id`: sin este índice, cerrar al mover un lote de 200 recorrería todos los
-- avisos abiertos de la empresa.

create index notificaciones_referencia_idx on public.notificaciones (referencia_id, tipo, usuario_id, creado_en desc)
  where referencia_id is not null;

-- Al moverse una unidad (toda escritura de fase deja su fila en `historial_fases`: `cambiar_fase`, el lote, los ítems), sus avisos `demora_fase`
-- abiertos quedan accionados para todos sus destinatarios: la demora era de la fase que dejó. Por `notificaciones_referencia_idx`.
create function public.alertas_cerrar_al_mover() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  update public.notificaciones n
     set accionada_en = now()
   where n.referencia_id = new.vehiculo_id and n.tipo = 'demora_fase' and n.accionada_en is null;
  return null;
end;
$$;

revoke all on function public.alertas_cerrar_al_mover() from public, anon, authenticated, service_role;

comment on function public.alertas_cerrar_al_mover() is
  'Alertas (6.12): after insert en historial_fases de un vehículo; acciona los avisos demora_fase abiertos de esa unidad, de todos sus destinatarios.';

create trigger trg_alertas_cerrar_al_mover
  after insert on public.historial_fases
  for each row when (new.vehiculo_id is not null)
  execute function public.alertas_cerrar_al_mover();
