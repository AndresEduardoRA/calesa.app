-- Esquema `web`: la superficie que consume la web pública (otro repo). anon sólo tiene USAGE
-- sobre `web` y EXECUTE en dos funciones; las vistas son security_invoker=false y su WHERE es
-- la frontera. El portal del cliente se llama con service_role desde la web.
-- Recordá exponer `web` en PostgREST: config.toml [api] schemas = ["public", "graphql_public", "web"].

create schema if not exists web;
grant usage on schema web to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vistas públicas
-- ---------------------------------------------------------------------------
create or replace view web.ajustes with (security_invoker = false) as
select e.nombre, e.razon_social, e.nit, e.direccion, e.ciudad, e.pais, e.whatsapp, e.logo_ruta, e.locale, e.moneda_base,
       w.nombre_sitio, w.lema, w.whatsapp_respaldo, w.horario, w.redes, w.mostrar_moneda_secundaria, w.legales, w.seo
from public.ajustes_empresa e cross join public.ajustes_web w where e.id = 1 and w.id = 1;

create or replace view web.asesores with (security_invoker = false) as
select p.id, p.handle, p.nombre, p.avatar_ruta as avatar, p.cargo_web as cargo, p.bio_web as bio, p.whatsapp_web as whatsapp,
       p.especialidades, p.creado_en as desde, q.orden
from public.perfiles p left join public.cola_web_asesores q on q.usuario_id = p.id
where p.publico_web and p.activo and not p.bloqueado and p.handle is not null and p.whatsapp_web is not null;

-- Vitrina: doble marca (vehículo + fase) + origen visible + integración web activa.
create or replace view web.vehiculos with (security_invoker = false) as
select v.id, v.numero, o.clave as origen, o.nombre as origen_nombre, v.titulo, v.marca, v.modelo, v.anio, v.kilometraje,
       v.precio_web as precio, v.precio_web_hasta as precio_hasta, v.precio_web_nota as precio_nota, v.destacado_web as destacado,
       case when o.tipo = 'subasta' then v.lote end as lote, v.subasta_en, v.subasta_fin_en, v.estado_subasta,
       case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end as vin_parcial,
       f.nombre as fase, c.nombre as categoria,
       (select jsonb_object_agg(oc.clave, v.atributos -> oc.clave) from public.origenes_campos oc where oc.origen_id = v.origen_id and oc.publico_web and oc.activo and v.atributos ? oc.clave) as atributos,
       (select i.ruta from public.vehiculos_imagenes i where i.vehiculo_id = v.id order by i.es_portada desc, i.orden limit 1) as imagen,
       (select coalesce(array_agg(i.ruta order by i.es_portada desc, i.orden), '{}') from public.vehiculos_imagenes i where i.vehiculo_id = v.id) as imagenes,
       v.precio_negociable, v.acepta_permuta, v.actualizado_en
from public.vehiculos v
join public.origenes o on o.id = v.origen_id
join public.fases f on f.id = v.fase_id
left join public.categorias c on c.id = v.categoria_id
cross join public.ajustes_web w
where w.id = 1 and v.publicado_web and v.eliminado_en is null and f.publica_web and f.activa and o.activo
  and v.origen_id = any (w.origenes_visibles)
  and exists (select 1 from public.integraciones i where i.clave = 'web_publica' and i.activa);

create or replace view web.guias with (security_invoker = false) as
select g.slug, g.titulo, g.resumen, g.cuerpo_html, g.portada_ruta as portada, c.slug as categoria, c.nombre as categoria_etiqueta,
       g.minutos_lectura, g.seo_titulo, g.seo_descripcion, g.publicada_en, g.orden,
       case when p.publico_web then p.nombre end as autor, case when p.publico_web then p.avatar_ruta end as autor_avatar, case when p.publico_web then p.handle end as autor_handle
from public.web_guias g left join public.web_categorias_guias c on c.id = g.categoria_id left join public.perfiles p on p.id = g.autor_id
where g.publicada_en is not null and g.publicada_en <= now();

create or replace view web.faqs with (security_invoker = false) as
select pregunta, respuesta, categoria, orden from public.web_faqs where publicada;

create or replace view web.testimonios with (security_invoker = false) as
select cliente, case when consent_ciudad then ciudad end as ciudad, texto, case when consent_vehiculo then vehiculo end as vehiculo,
       case when consent_foto then foto_ruta end as foto, orden
from public.web_testimonios
where publicado and consent_por is not null and consent_en is not null and consent_canal is not null and consent_retirado_en is null;

grant select on web.ajustes, web.asesores, web.vehiculos, web.guias, web.faqs, web.testimonios to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cola web (ruleta): solicitar asesor, expirar, confirmar, vincular
-- ---------------------------------------------------------------------------
create or replace function public.web_expirar_solicitudes(p_limite int default 200)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; w public.ajustes_web; cand uuid; ttl interval;
begin
  select * into w from public.ajustes_web where id = 1;
  ttl := make_interval(mins => w.ttl_contacto_minutos);
  for r in select * from public.solicitudes_contacto_web s where s.estado = 'asignada' and not s.es_directa and s.vence_en < now() order by s.vence_en limit p_limite loop
    update public.solicitudes_contacto_web set estado = 'vencida' where id = r.id;
    update public.cola_web_asesores set vencidas_total = vencidas_total + 1 where usuario_id = r.usuario_id;
    insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta)
    values (r.usuario_id, 'turno_web_perdido', 'Se venció un turno de la web', r.codigo, 'solicitud_web', r.id, '/notificaciones') on conflict do nothing;
    n := n + 1;
    if r.intento < w.max_intentos then
      -- reasignar excluyendo toda la cadena
      select q.usuario_id into cand
      from public.cola_web_asesores q join public.perfiles p on p.id = q.usuario_id
      where q.habilitado and q.disponible and p.activo and not p.bloqueado and p.whatsapp_web is not null
        and q.usuario_id not in (
          with recursive cadena as (
            select id, usuario_id, solicitud_previa_id from public.solicitudes_contacto_web where id = r.id
            union all select s.id, s.usuario_id, s.solicitud_previa_id from public.solicitudes_contacto_web s join cadena c on s.id = c.solicitud_previa_id)
          select usuario_id from cadena where usuario_id is not null)
      order by ((select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) >= coalesce(q.max_abiertas, w.max_abiertas_default)),
               (select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa),
               q.prioridad desc, q.ultima_asignacion_en asc nulls first, q.orden, q.usuario_id
      limit 1;
      if cand is not null then
        insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, fuente, ruta, vehiculo_id, utm, intento, solicitud_previa_id, vence_en)
        values ('#WEB-' || public.codigo_dictable(4), r.token_visitante, cand, 'asignada', r.fuente, r.ruta, r.vehiculo_id, r.utm, r.intento + 1, r.id, now() + ttl);
        update public.cola_web_asesores set ultima_asignacion_en = now(), asignadas_total = asignadas_total + 1 where usuario_id = cand;
        insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion)
        select cand, 'turno_web', 'Turno de la web (reasignado)', s.codigo, 'solicitud_web', s.id, '/notificaciones', true from public.solicitudes_contacto_web s where s.solicitud_previa_id = r.id on conflict do nothing;
      end if;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.web_expirar_solicitudes(int) from public, anon, authenticated;
grant execute on function public.web_expirar_solicitudes(int) to service_role;

create or replace function web.solicitar_asesor(p_token text, p_fuente text, p_ruta text default null, p_vehiculo_id uuid default null, p_handle text default null, p_utm jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.ajustes_web; e public.ajustes_empresa; cand uuid; s public.solicitudes_contacto_web; p public.perfiles; ttl interval; v_titulo text; v_codigo text; abiertas int;
begin
  if p_token !~ '^[A-Za-z0-9_-]{16,64}$' then raise exception 'token inválido' using errcode = '22023'; end if;
  select * into w from public.ajustes_web where id = 1;
  select * into e from public.ajustes_empresa where id = 1;
  ttl := make_interval(mins => w.ttl_contacto_minutos);
  perform public.web_expirar_solicitudes(20);
  select titulo into v_titulo from web.vehiculos where id = p_vehiculo_id;
  -- 1) contacto directo por handle: sin sorteo, sin vencimiento, no mueve el puntero
  if p_handle is not null then
    select pf.* into p from public.perfiles pf where pf.handle = p_handle and pf.publico_web and pf.activo and not pf.bloqueado and pf.whatsapp_web is not null;
    if p.id is not null then
      v_codigo := '#WEB-' || public.codigo_dictable(4);
      insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, es_directa, fuente, ruta, vehiculo_id, utm)
      values (v_codigo, p_token, p.id, 'asignada', true, p_fuente, p_ruta, p_vehiculo_id, p_utm) returning * into s;
      insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion)
      values (p.id, 'turno_web', 'Contacto directo desde la web', coalesce(v_titulo, v_codigo), 'solicitud_web', s.id, '/notificaciones', true) on conflict do nothing;
      return jsonb_build_object('ref', v_codigo, 'handle', p.handle, 'nombre', p.nombre, 'avatar', p.avatar_ruta, 'cargo', p.cargo_web, 'whatsapp', p.whatsapp_web, 'es_directo', true, 'es_respaldo', false, 'mensaje', 'Hola ' || split_part(p.nombre, ' ', 1) || ', vi ' || coalesce(v_titulo, 'la web') || ' y quiero más información. (Ref: ' || v_codigo || ')');
    end if;
  end if;
  -- 2) anti-abuso
  if (select count(*) from public.solicitudes_contacto_web x where x.token_visitante = p_token and x.creado_en > now() - interval '1 hour') >= 12 then
    return jsonb_build_object('es_respaldo', true, 'whatsapp', w.whatsapp_respaldo, 'mensaje', 'Hola, quiero más información.');
  end if;
  -- 3) ya tiene una abierta: la misma, reloj a cero
  select x.* into s from public.solicitudes_contacto_web x where x.token_visitante = p_token and x.estado = 'asignada' and not x.es_directa order by x.creado_en desc limit 1;
  if s.id is not null then
    update public.solicitudes_contacto_web set vence_en = now() + ttl where id = s.id;
    cand := s.usuario_id;
  end if;
  -- 4) pegajoso: su último asesor dentro del plazo, si sigue elegible
  if cand is null and w.dias_pegajoso > 0 then
    select x.usuario_id into cand from public.solicitudes_contacto_web x join public.cola_web_asesores q on q.usuario_id = x.usuario_id join public.perfiles pf on pf.id = q.usuario_id
    where x.token_visitante = p_token and x.estado in ('asignada', 'contactada') and x.creado_en > now() - make_interval(days => w.dias_pegajoso)
      and q.habilitado and pf.activo and not pf.bloqueado and pf.whatsapp_web is not null
    order by x.creado_en desc limit 1;
  end if;
  -- 5) ruleta, serializada
  if cand is null and w.cola_activa then
    perform pg_advisory_xact_lock(hashtext('cola_web'));
    select q.usuario_id into cand
    from public.cola_web_asesores q join public.perfiles pf on pf.id = q.usuario_id
    where q.habilitado and q.disponible and pf.activo and not pf.bloqueado and pf.whatsapp_web is not null
    order by ((select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) >= coalesce(q.max_abiertas, w.max_abiertas_default)),
             (select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) / greatest(q.prioridad + 1, 1),
             q.ultima_asignacion_en asc nulls first, q.orden, q.usuario_id
    limit 1;
  end if;
  if cand is null then
    insert into public.solicitudes_contacto_web (codigo, token_visitante, estado, fuente, ruta, vehiculo_id, utm) values ('#WEB-' || public.codigo_dictable(4), p_token, 'sin_asignar', p_fuente, p_ruta, p_vehiculo_id, p_utm);
    return jsonb_build_object('es_respaldo', true, 'whatsapp', w.whatsapp_respaldo, 'mensaje', 'Hola, vi ' || coalesce(v_titulo, 'la web') || ' y quiero más información.');
  end if;
  if s.id is null then
    v_codigo := '#WEB-' || public.codigo_dictable(4);
    insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, fuente, ruta, vehiculo_id, utm, vence_en)
    values (v_codigo, p_token, cand, 'asignada', p_fuente, p_ruta, p_vehiculo_id, p_utm, now() + ttl) returning * into s;
    update public.cola_web_asesores set ultima_asignacion_en = now(), asignadas_total = asignadas_total + 1 where usuario_id = cand;
    insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_tipo, referencia_id, ruta, requiere_accion)
    values (cand, 'turno_web', 'Turno de la web', coalesce(v_titulo, v_codigo), 'solicitud_web', s.id, '/notificaciones', true) on conflict do nothing;
  end if;
  select * into p from public.perfiles where id = cand;
  return jsonb_build_object('ref', s.codigo, 'handle', p.handle, 'nombre', p.nombre, 'avatar', p.avatar_ruta, 'cargo', p.cargo_web, 'whatsapp', p.whatsapp_web, 'expira_en', s.vence_en, 'es_directo', false, 'es_respaldo', false,
    'mensaje', 'Hola ' || split_part(p.nombre, ' ', 1) || ', vi ' || coalesce(v_titulo, 'la web') || ' y quiero más información. (Ref: ' || s.codigo || ')');
end;
$$;
revoke all on function web.solicitar_asesor(text, text, text, uuid, text, jsonb) from public;
grant execute on function web.solicitar_asesor(text, text, text, uuid, text, jsonb) to anon, authenticated;

create or replace function web.registrar_evento(p_token text, p_evento text, p_ruta text default null, p_referencia_id uuid default null, p_utm jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_token !~ '^[A-Za-z0-9_-]{16,64}$' or p_evento not in ('page_view', 'vehiculo_view', 'contacto_click', 'guia_view', 'filtro_uso', 'asesor_view') then return; end if;
  insert into public.eventos_web (token, evento, ruta, referencia_id, utm) values (p_token, p_evento, left(p_ruta, 300), p_referencia_id, p_utm);
end;
$$;
revoke all on function web.registrar_evento(text, text, text, uuid, jsonb) from public;
grant execute on function web.registrar_evento(text, text, text, uuid, jsonb) to anon, authenticated;

-- El asesor confirma que contactó / vincula a un lead
create or replace function public.web_confirmar_contacto(p_solicitud uuid, p_lead uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.solicitudes_contacto_web;
begin
  perform public.assert_activo();
  select * into s from public.solicitudes_contacto_web where id = p_solicitud;
  if s.id is null or (s.usuario_id <> (select auth.uid()) and not public.tiene_permiso('web.cola.gestionar')) then raise exception 'Sin acceso a esta solicitud.' using errcode = '42501'; end if;
  if p_lead is not null and not public.puede_lead(p_lead, 'leads.ver') then raise exception 'Sin acceso al lead.' using errcode = '42501'; end if;
  update public.solicitudes_contacto_web set estado = 'contactada', contactada_en = coalesce(contactada_en, now()), contactada_por = (select auth.uid()),
    senal_contacto = case when p_lead is not null then 'lead' else 'manual' end, lead_id = coalesce(p_lead, lead_id) where id = p_solicitud and estado in ('asignada', 'vencida');
  if found then update public.cola_web_asesores set contactadas_total = contactadas_total + 1 where usuario_id = s.usuario_id; end if;
  update public.notificaciones set accionada_en = now() where referencia_tipo = 'solicitud_web' and referencia_id = p_solicitud and usuario_id = (select auth.uid());
end;
$$;

create or replace function public.cola_web_configurar(p_usuario uuid, p_habilitado boolean, p_max_abiertas int default null, p_prioridad smallint default 0, p_orden smallint default 0)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('web.cola.gestionar');
  insert into public.cola_web_asesores (usuario_id, habilitado, max_abiertas, prioridad, orden) values (p_usuario, p_habilitado, p_max_abiertas, p_prioridad, p_orden)
  on conflict (usuario_id) do update set habilitado = excluded.habilitado, max_abiertas = excluded.max_abiertas, prioridad = excluded.prioridad, orden = excluded.orden;
end;
$$;

create or replace view public.estado_cola_web with (security_invoker = true) as
select q.usuario_id, p.nombre, p.handle, q.habilitado, q.disponible, q.prioridad, q.orden, coalesce(q.max_abiertas, w.max_abiertas_default) as cupo,
       (select count(*) from public.solicitudes_contacto_web s where s.usuario_id = q.usuario_id and s.estado = 'asignada' and not s.es_directa) as abiertas,
       q.asignadas_total, q.contactadas_total, q.vencidas_total,
       case when q.asignadas_total > 0 then round(100.0 * q.contactadas_total / q.asignadas_total, 1) end as tasa_contacto_pct,
       q.ultima_asignacion_en
from public.cola_web_asesores q join public.perfiles p on p.id = q.usuario_id cross join public.ajustes_web w where w.id = 1 and p.activo;
grant select on public.estado_cola_web to authenticated;

revoke all on function public.web_confirmar_contacto(uuid, uuid) from public, anon;
revoke all on function public.cola_web_configurar(uuid, boolean, int, smallint, smallint) from public, anon;
grant execute on function public.web_confirmar_contacto(uuid, uuid), public.cola_web_configurar(uuid, boolean, int, smallint, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- Portal del cliente: sólo service_role (la web lo llama desde un route handler con cookie firmada)
-- ---------------------------------------------------------------------------
create or replace function web.portal_login(p_codigo text, p_clave text)
returns table (lead_id uuid, nombre text, debe_cambiar_clave boolean)
language plpgsql security definer set search_path = '' as $$
declare a public.accesos_portal;
begin
  select * into a from public.accesos_portal where codigo = upper(p_codigo) and habilitado;
  if a.lead_id is null then return; end if;
  if a.bloqueado_hasta is not null and a.bloqueado_hasta > now() then raise exception 'Acceso bloqueado temporalmente.' using errcode = '42501'; end if;
  if a.clave_hash <> extensions.crypt(p_clave, a.clave_hash) then
    update public.accesos_portal set intentos_fallidos = intentos_fallidos + 1, bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' end where accesos_portal.lead_id = a.lead_id;
    return;
  end if;
  update public.accesos_portal set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_ingreso_en = now() where accesos_portal.lead_id = a.lead_id;
  return query select l.id, l.nombre, a.debe_cambiar_clave from public.leads l where l.id = a.lead_id and l.eliminado_en is null;
end;
$$;

create or replace function web.portal_cambiar_clave(p_lead uuid, p_actual text, p_nueva text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.accesos_portal;
begin
  select * into a from public.accesos_portal where lead_id = p_lead and habilitado;
  if a.lead_id is null or a.clave_hash <> extensions.crypt(p_actual, a.clave_hash) then return false; end if;
  if length(coalesce(p_nueva, '')) < 8 then raise exception 'La clave necesita al menos 8 caracteres.' using errcode = '22023'; end if;
  update public.accesos_portal set clave_hash = extensions.crypt(p_nueva, extensions.gen_salt('bf')), debe_cambiar_clave = false where lead_id = p_lead;
  return true;
end;
$$;

-- Foto del cliente: SOLO lo marcado visible. Nunca costos, proveedores, rutas de archivo ni VIN completo.
create or replace function web.portal_snapshot(p_lead uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'cliente', (select jsonb_build_object('nombre', l.nombre) from public.leads l where l.id = p_lead and l.eliminado_en is null),
    'asesor', (select jsonb_build_object('nombre', p.nombre, 'whatsapp', p.whatsapp_web, 'avatar', p.avatar_ruta) from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id where la.lead_id = p_lead and la.tipo_acceso = 'dueno' and la.revocado_en is null),
    'vehiculos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'anio', v.anio, 'vin_parcial', case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end,
        'imagenes', (select coalesce(jsonb_agg(i.ruta order by i.es_portada desc, i.orden), '[]'::jsonb) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'fase', case when f.visible_portal then jsonb_build_object('nombre', f.alias_portal, 'descripcion', f.descripcion_portal, 'desde', v.fase_desde) end,
        'linea_tiempo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', fz.alias_portal, 'en', h.creado_en) order by h.creado_en), '[]'::jsonb) from public.historial_fases h join public.fases fz on fz.id = h.a_fase_id where h.vehiculo_id = v.id and fz.visible_portal),
        'embarque', (select jsonb_build_object('zarpe', t.zarpe_el, 'eta', t.eta_el, 'arribo', t.arribo_el) from public.transportes t where t.vehiculo_id = v.id),
        'documentos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', td.nombre, 'estado', d.estado, 'fecha', d.creado_en)), '[]'::jsonb) from public.documentos d join public.tipos_documento td on td.id = d.tipo_documento_id where d.vehiculo_id = v.id and d.visible_portal and d.estado <> 'rechazado' and d.eliminado_en is null),
        'seguimientos', (select coalesce(jsonb_agg(jsonb_build_object('titulo', s.titulo, 'detalle', s.detalle_texto, 'en', s.ocurrido_en) order by s.ocurrido_en desc), '[]'::jsonb) from public.seguimientos s where s.lead_id = p_lead and s.vehiculo_id = v.id and s.visibilidad = 'publico' and s.eliminado_en is null),
        'pagos', (select coalesce(jsonb_agg(jsonb_build_object('concepto', pg.concepto, 'monto', pg.monto, 'moneda', pg.moneda, 'fecha', pg.fecha, 'confirmado', pg.confirmado) order by pg.fecha), '[]'::jsonb) from public.pagos pg where pg.vehiculo_id = v.id and pg.eliminado_en is null)
      )) from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.lead_id = p_lead and v.eliminado_en is null), '[]'::jsonb)
  );
$$;

create or replace function web.portal_documento_ruta(p_lead uuid, p_documento uuid)
returns text language sql stable security definer set search_path = '' as $$
  select d.ruta from public.documentos d join public.vehiculos v on v.id = d.vehiculo_id
  where d.id = p_documento and v.lead_id = p_lead and d.visible_portal and d.estado <> 'rechazado' and d.eliminado_en is null and v.eliminado_en is null;
$$;

revoke all on function web.portal_login(text, text), web.portal_cambiar_clave(uuid, text, text), web.portal_snapshot(uuid), web.portal_documento_ruta(uuid, uuid) from public, anon, authenticated;
grant execute on function web.portal_login(text, text), web.portal_cambiar_clave(uuid, text, text), web.portal_snapshot(uuid), web.portal_documento_ruta(uuid, uuid) to service_role;
