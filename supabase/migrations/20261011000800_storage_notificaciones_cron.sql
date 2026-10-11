-- Buckets y políticas de storage, refcount contra huérfanos, notificaciones, jobs de pg_cron.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('marca', 'marca', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('avatares', 'avatares', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('vehiculos', 'vehiculos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('web', 'web', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('repuestos', 'repuestos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('documentos', 'documentos', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('cotizaciones', 'cotizaciones', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('comprobantes', 'comprobantes', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('importaciones', 'importaciones', false, 52428800, array['text/csv', 'text/plain'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de storage.objects. Públicos: lectura anónima; escritura por permiso.
-- Privados: lectura y escritura por el acceso a la entidad (prefijo = id de la entidad).
-- storage.objects ya trae RLS activo y su dueño es supabase_storage_admin: un `alter table … enable
-- row level security` desde una migración falla con «must be owner of table objects».

create policy "marca: leer" on storage.objects for select to anon, authenticated using (bucket_id in ('marca', 'avatares', 'vehiculos', 'web', 'repuestos'));
create policy "marca: escribir" on storage.objects for insert to authenticated with check (bucket_id = 'marca' and (select public.tiene_permiso('empresa.ajustes.gestionar')));
create policy "marca: borrar" on storage.objects for delete to authenticated using (bucket_id = 'marca' and (select public.tiene_permiso('empresa.ajustes.gestionar')));
create policy "avatares: propio" on storage.objects for insert to authenticated with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatares: borrar propio" on storage.objects for delete to authenticated using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vehiculos: subir" on storage.objects for insert to authenticated with check (bucket_id = 'vehiculos' and (select public.puede_vehiculo(((storage.foldername(name))[1])::uuid, 'vehiculos.editar')));
create policy "vehiculos: borrar" on storage.objects for delete to authenticated using (bucket_id = 'vehiculos' and (select public.puede_vehiculo(((storage.foldername(name))[1])::uuid, 'vehiculos.editar')));
create policy "web: escribir" on storage.objects for insert to authenticated with check (bucket_id = 'web' and (select public.tiene_permiso('web.contenido.gestionar')));
create policy "web: borrar" on storage.objects for delete to authenticated using (bucket_id = 'web' and (select public.tiene_permiso('web.contenido.gestionar')));
create policy "repuestos: escribir" on storage.objects for insert to authenticated with check (bucket_id = 'repuestos' and (select public.tiene_permiso('repuestos.editar')));
create policy "repuestos: borrar" on storage.objects for delete to authenticated using (bucket_id = 'repuestos' and (select public.tiene_permiso('repuestos.editar')));
-- documentos/{vehiculo_id|repuesto_id}/… — el prefijo dice la unidad
create policy "documentos: leer" on storage.objects for select to authenticated using (bucket_id = 'documentos' and (
  (select public.puede_vehiculo(((storage.foldername(name))[1])::uuid, 'logistica.ver')) or (select public.puede_repuesto(((storage.foldername(name))[1])::uuid, 'repuestos.ver'))));
create policy "documentos: subir" on storage.objects for insert to authenticated with check (bucket_id = 'documentos' and (
  (select public.puede_vehiculo(((storage.foldername(name))[1])::uuid, 'logistica.documentos.subir')) or (select public.puede_repuesto(((storage.foldername(name))[1])::uuid, 'repuestos.documentos.subir'))));
-- cotizaciones/{cotizacion_id}/…
create policy "cotizaciones: leer" on storage.objects for select to authenticated using (bucket_id = 'cotizaciones' and (select public.puede_cotizacion(((storage.foldername(name))[1])::uuid, 'cotizaciones.ver')));
create policy "cotizaciones: subir" on storage.objects for insert to authenticated with check (bucket_id = 'cotizaciones' and (select public.puede_cotizacion(((storage.foldername(name))[1])::uuid, 'cotizaciones.editar')));
create policy "comprobantes: leer" on storage.objects for select to authenticated using (bucket_id = 'comprobantes' and ((select public.tiene_permiso('logistica.gastos.ver')) or (select public.tiene_permiso('logistica.pagos.ver')) or (select public.tiene_permiso('repuestos.costos.ver'))));
create policy "comprobantes: subir" on storage.objects for insert to authenticated with check (bucket_id = 'comprobantes' and ((select public.tiene_permiso('logistica.gastos.editar')) or (select public.tiene_permiso('logistica.pagos.editar')) or (select public.tiene_permiso('repuestos.costos.editar'))));
create policy "importaciones: propio" on storage.objects for all to authenticated using (bucket_id = 'importaciones' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'importaciones' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Los objetos de documentos y cotizaciones NO se borran por API desde el cliente: borrado suave en la fila y purga con refcount.

-- ---------------------------------------------------------------------------
-- Refcount: quién referencia un objeto (único mapa, lo usa la purga y la edge function storage-gc)
-- ---------------------------------------------------------------------------
create or replace function public.storage_refcount(p_bucket text, p_ruta text)
returns int language sql stable security definer set search_path = '' as $$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta))
  )::int;
$$;
revoke all on function public.storage_refcount(text, text) from public, anon;
grant execute on function public.storage_refcount(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Notificaciones: helper + triggers de tareas, recordatorios, demora de fase
-- ---------------------------------------------------------------------------
create or replace function public.notificar(p_usuario uuid, p_tipo text, p_titulo text, p_cuerpo text, p_ref_tipo text, p_ref_id uuid, p_ruta text, p_accion boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion)
  values (p_usuario, p_tipo, p_titulo, p_cuerpo, p_ref_tipo, p_ref_id, p_ruta, p_accion) on conflict do nothing;
$$;
revoke all on function public.notificar(uuid, text, text, text, text, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.notificar(uuid, text, text, text, text, uuid, text, boolean) to service_role;

create or replace function public.tarea_notificar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.responsable_id <> new.creado_por and (tg_op = 'INSERT' or new.responsable_id <> old.responsable_id) then
    perform public.notificar(new.responsable_id, 'tarea_asignada', 'Te asignaron una tarea', new.titulo, 'tarea', new.id, '/agenda?tarea=' || new.id, true);
  end if;
  return null;
end;
$$;
create trigger trg_tarea_notificar after insert or update of responsable_id on public.tareas for each row execute function public.tarea_notificar();

create or replace function public.reasignar_tarea(p_tarea uuid, p_responsable uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('agenda.tareas.asignar');
  if not exists (select 1 from public.tareas where id = p_tarea and (creado_por = (select auth.uid()) or responsable_id = (select auth.uid()))) then raise exception 'Sin acceso a la tarea.' using errcode = '42501'; end if;
  if not public.usuario_tiene_permiso(p_responsable, 'agenda.tareas.recibir') then raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514'; end if;
  update public.tareas set responsable_id = p_responsable where id = p_tarea;
end;
$$;
revoke all on function public.reasignar_tarea(uuid, uuid) from public, anon;
grant execute on function public.reasignar_tarea(uuid, uuid) to authenticated;

-- Recordatorios vencidos → notificación (cron cada minuto)
create or replace function public.recordatorios_notificar()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select * from public.recordatorios where notificado_en is null and completado_en is null and recordar_en <= now() limit 200 loop
    perform public.notificar(r.usuario_id, 'recordatorio', r.titulo, null, 'recordatorio', r.id, case when r.lead_id is not null then '/leads/' || r.lead_id else '/agenda' end, true);
    update public.recordatorios set notificado_en = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Alertas por demora de fase: a quien puede mover la unidad (permiso del origen), anti-spam por fase.
create or replace function public.alertas_demora()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; dflt int;
begin
  select demora_dias_default into dflt from public.ajustes_empresa where id = 1;
  for r in
    select v.id, v.titulo, v.origen_id, f.nombre as fase, f.id as fase_id, coalesce(f.demora_dias, dflt) as dias, v.fase_desde
    from public.vehiculos v join public.fases f on f.id = v.fase_id join public.flujos fl on fl.id = f.flujo_id
    where v.eliminado_en is null and f.es_logistica and not f.es_final and coalesce(f.demora_dias, dflt) > 0
      and v.fase_desde < now() - make_interval(days => coalesce(f.demora_dias, dflt))
      and public.flujo_regla_activa(fl.id, 'alerta_demora')
  loop
    insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion)
    select distinct ur.usuario_id, 'demora_fase', 'Vehículo demorado en «' || r.fase || '»', r.titulo || ' lleva más de ' || r.dias || ' días', 'vehiculo', r.id, '/logistica/vehiculo/' || r.id, true
    from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id join public.perfiles p on p.id = ur.usuario_id
    where rp.permiso_clave = 'flujos.mover' and (rp.origen_id is null or rp.origen_id = r.origen_id) and p.activo and not p.bloqueado
    on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.actividad_purgar()
returns int language plpgsql security definer set search_path = '' as $$
declare d int; n int;
begin
  select actividad_dias into d from public.ajustes_empresa where id = 1;
  delete from public.actividad where creado_en < now() - make_interval(days => d);
  get diagnostics n = row_count;
  delete from public.eventos_web where creado_en < now() - interval '12 months';
  delete from public.visitados where visto_en < now() - interval '30 days';
  delete from public.notificaciones where creado_en < now() - interval '90 days' and (leida_en is not null or accionada_en is not null);
  return n;
end;
$$;

revoke all on function public.recordatorios_notificar(), public.alertas_demora(), public.actividad_purgar() from public, anon, authenticated;
grant execute on function public.recordatorios_notificar(), public.alertas_demora(), public.actividad_purgar() to service_role;

-- ---------------------------------------------------------------------------
-- pg_cron (si está habilitado en el proyecto)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('recordatorios', '* * * * *', $j$ select public.recordatorios_notificar() $j$);
    perform cron.schedule('web-expirar', '*/5 * * * *', $j$ select public.web_expirar_solicitudes(200) $j$);
    perform cron.schedule('alertas-demora', '0 */6 * * *', $j$ select public.alertas_demora() $j$);
    perform cron.schedule('papelera-purgar', '30 3 * * *', $j$ select public.papelera_purgar_vencidos() $j$);
    perform cron.schedule('actividad-purgar', '45 3 * * *', $j$ select public.actividad_purgar() $j$);
  else
    raise notice 'pg_cron no está habilitado: habilitalo en Database › Extensions y volvé a correr esta sección.';
  end if;
end $$;
