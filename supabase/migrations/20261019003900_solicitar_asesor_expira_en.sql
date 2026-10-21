-- 8-2: `web.solicitar_asesor` respondía `expira_en` con el `vence_en` leído ANTES de reiniciar el reloj del turno abierto (paso 3): la web mostraba
-- «dentro de 1 min» cuando la tabla decía 30. El `update` ahora devuelve la fila (`returning * into s`) y la respuesta sale de ella. Es la única rama con
-- ese patrón: el directo (1) no tiene vencimiento, y el pegajoso (4) y la rueda (5) insertan con `returning * into s`. Mismo cuerpo que
-- `20261019003800_rueda_por_rol.sql`, una línea cambia.
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
  -- 3) ya tiene una abierta: la misma. El reloj vuelve a cero sólo si quien la tiene puede estar en la rueda: si no, vence a su hora y se reasigna. `returning * into s`: la respuesta lleva el vencimiento nuevo.
  select x.* into s from public.solicitudes_contacto_web x where x.token_visitante = p_token and x.estado = 'asignada' and not x.es_directa order by x.creado_en desc limit 1;
  if s.id is not null then
    if public.puede_estar_en_la_rueda(s.usuario_id) then
      update public.solicitudes_contacto_web set vence_en = now() + ttl where id = s.id returning * into s;
    end if;
    cand := s.usuario_id;
  end if;
  -- 4) pegajoso: su último asesor dentro del plazo, si sigue elegible
  if cand is null and w.dias_pegajoso > 0 then
    select x.usuario_id into cand from public.solicitudes_contacto_web x join public.cola_web_asesores q on q.usuario_id = x.usuario_id join public.perfiles pf on pf.id = q.usuario_id
    where x.token_visitante = p_token and x.estado in ('asignada', 'contactada') and x.creado_en > now() - make_interval(days => w.dias_pegajoso)
      and q.habilitado and pf.whatsapp_web is not null and public.puede_estar_en_la_rueda(q.usuario_id)
    order by x.creado_en desc limit 1;
  end if;
  -- 5) ruleta, serializada
  if cand is null and w.cola_activa then
    perform pg_advisory_xact_lock(hashtext('cola_web'));
    select q.usuario_id into cand
    from public.cola_web_asesores q join public.perfiles pf on pf.id = q.usuario_id
    where q.habilitado and q.disponible and pf.whatsapp_web is not null and public.puede_estar_en_la_rueda(q.usuario_id)
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
