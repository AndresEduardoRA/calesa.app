-- Índices: toda FK del lado que referencia, toda columna que aparece en una policy, filtros
-- por defecto de la UX y búsqueda por trigram (≥ 3 caracteres).

-- FKs sin índice: se detectan y crean en bloque (Postgres no las indexa solo).
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabla, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public' and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
  loop
    execute format('create index if not exists %I on %s (%I)', replace(r.tabla::text, 'public.', '') || '_' || r.col || '_idx', r.tabla, r.col);
  end loop;
end $$;

-- Policies y alcance
create index if not exists leads_asesores_usuario_vigente_idx on public.leads_asesores (usuario_id, lead_id) where revocado_en is null;
create index if not exists usuarios_roles_usuario_idx on public.usuarios_roles (usuario_id);
create index if not exists roles_permisos_rol_clave_idx on public.roles_permisos (rol_id, permiso_clave);
create index if not exists conversaciones_miembros_usuario_idx on public.conversaciones_miembros (usuario_id);

-- Filtros por defecto de la UX
create index if not exists leads_vivos_seguimiento_idx on public.leads (ultimo_seguimiento_en desc nulls last) where eliminado_en is null;
create index if not exists leads_creado_por_vivos_idx on public.leads (creado_por, creado_en desc) where eliminado_en is null;
create index if not exists vehiculos_origen_fase_idx on public.vehiculos (origen_id, fase_id) where eliminado_en is null;
create index if not exists vehiculos_subasta_idx on public.vehiculos (subasta_en) where eliminado_en is null and subasta_en is not null;
create index if not exists vehiculos_vitrina_idx on public.vehiculos (origen_id, destacado_web desc, actualizado_en desc) where publicado_web and eliminado_en is null;
create index if not exists vehiculos_atributos_gin on public.vehiculos using gin (atributos jsonb_path_ops);
create index if not exists cotizaciones_lead_idx on public.cotizaciones (lead_id, creado_en desc) where eliminado_en is null;
create index if not exists cotizaciones_vehiculo_idx on public.cotizaciones (vehiculo_id) where eliminado_en is null;
create index if not exists cotizaciones_creador_idx on public.cotizaciones (creado_por, creado_en desc) where eliminado_en is null;
create index if not exists seguimientos_lead_fecha_idx on public.seguimientos (lead_id, ocurrido_en desc) where eliminado_en is null;
create index if not exists recordatorios_pendientes_idx on public.recordatorios (recordar_en) where notificado_en is null and completado_en is null;
create index if not exists documentos_unidad_tipo_idx on public.documentos (vehiculo_id, tipo_documento_id, estado) where eliminado_en is null;
create index if not exists documentos_repuesto_idx on public.documentos (repuesto_id, tipo_documento_id, estado) where eliminado_en is null;
create index if not exists documentos_vencen_idx on public.documentos (vence_el) where estado = 'aprobado' and eliminado_en is null and vence_el is not null;
create index if not exists historial_fases_vehiculo_idx on public.historial_fases (vehiculo_id, creado_en);
create index if not exists historial_fases_repuesto_idx on public.historial_fases (repuesto_id, creado_en);
create index if not exists gastos_vehiculo_idx on public.gastos (vehiculo_id) where eliminado_en is null;
create index if not exists pagos_vehiculo_idx on public.pagos (vehiculo_id) where eliminado_en is null;
create index if not exists transportes_booking_idx on public.transportes (booking) where booking is not null;
create index if not exists transportes_contenedor_idx on public.transportes (contenedor) where contenedor is not null;
create index if not exists mensajes_conversacion_fecha_idx on public.mensajes (conversacion_id, creado_en desc);
create index if not exists notificaciones_usuario_abiertas_idx on public.notificaciones (usuario_id, creado_en desc) where leida_en is null;
create index if not exists actividad_fecha_idx on public.actividad (creado_en desc);
create index if not exists actividad_registro_idx on public.actividad (tabla, registro_id);
create index if not exists solicitudes_web_vencen_idx on public.solicitudes_contacto_web (vence_en) where estado = 'asignada' and not es_directa;
create index if not exists solicitudes_web_token_idx on public.solicitudes_contacto_web (token_visitante, creado_en desc);
create index if not exists solicitudes_web_asesor_abiertas_idx on public.solicitudes_contacto_web (usuario_id) where estado = 'asignada' and not es_directa;
create index if not exists eventos_web_fecha_idx on public.eventos_web (creado_en);
create index if not exists tareas_responsable_idx on public.tareas (responsable_id, vence_en) where eliminado_en is null;
create index if not exists eventos_inicio_idx on public.eventos (inicia_en) where eliminado_en is null;
create index if not exists lotes_papelera_pendientes_idx on public.lotes_papelera (creado_en) where purgado_en is null and restaurado_en is null;

-- Búsqueda (buscador global, ≥ 3 caracteres)
create index if not exists leads_nombre_trgm on public.leads using gin (nombre extensions.gin_trgm_ops);
create index if not exists vehiculos_titulo_trgm on public.vehiculos using gin (titulo extensions.gin_trgm_ops);
create index if not exists vehiculos_vin_trgm on public.vehiculos using gin (vin extensions.gin_trgm_ops);
create index if not exists vehiculos_lote_trgm on public.vehiculos using gin (lote extensions.gin_trgm_ops);
create index if not exists cotizaciones_titulo_trgm on public.cotizaciones using gin (titulo extensions.gin_trgm_ops);
create index if not exists seguimientos_texto_trgm on public.seguimientos using gin (detalle_texto extensions.gin_trgm_ops);
