-- La rueda de turnos de la web, por rol (`web.cola.participar`).
--
-- Hasta hoy entraba a la rueda quien tenía `cola_web_asesores.habilitado` (una decisión sobre la persona). Ahora además hace falta que
-- algún rol de la persona tenga `web.cola.participar`: un rol que vende pero no debe recibir turnos (un admin, un editor) queda fuera sin
-- tocar nada de su `leads.*`. Elegible = `habilitado` y el permiso por alguno de sus roles (la unión de siempre: sin herencia ni negación),
-- con la cuenta activa y sin bloqueo, **evaluado al repartir**: quitar el permiso saca a la persona al instante sin borrar `habilitado`, y
-- devolverlo la reincorpora como estaba. `puede_estar_en_la_rueda()` es el único lugar donde está esa regla; la llaman la rueda, el
-- pegajoso, la reasignación al vencer, el turno que ya estaba abierto y la lista `estado_cola_web`.
--
-- Sin índice, trigger ni columna nuevos: el permiso de una persona es una bajada por `usuarios_roles_pkey` y `roles_permisos_rol_clave_idx`.
--
-- Un turno ya asignado a quien pierde el permiso sigue hasta su cierre («Contacté», vencimiento o intentos): `web_confirmar_contacto` no
-- mira el permiso. Lo que cambia es que (a) la reasignación al vencer y la rueda no le mandan nada nuevo, y (b) si la visitante vuelve a
-- hacer clic, el reloj de esa solicitud **no se reinicia** (antes, con clics seguidos, quien ya no podía recibirla la retenía para siempre).

-- ---------------------------------------------------------------------------------------------------
-- El permiso, y a quién se concede: el dueño, el rol `asesor` y todo rol de una persona que hoy está habilitada.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('web.cola.participar', 'web', 'Recibir turnos de la web',
   'Las personas con este rol pueden estar en la rueda de turnos de la web pública. Sin este permiso no reciben turnos ni figuran en la rueda, aunque estén habilitadas; sus leads no cambian',
   false, false, 'puede_estar_en_la_rueda: web.solicitar_asesor, web_expirar_solicitudes, estado_cola_web', 655)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

do $$
declare v_nuevos text;
begin
  with concedidos as (
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, 'web.cola.participar', 'todos'::public.alcance_permiso
      from public.roles r
     where r.clave in ('dueno', 'asesor')
        or r.id in (select ur.rol_id from public.usuarios_roles ur join public.cola_web_asesores q on q.usuario_id = ur.usuario_id where q.habilitado)
    on conflict do nothing
    returning rol_id)
  select string_agg(r.clave, ', ' order by r.clave) into v_nuevos from concedidos c join public.roles r on r.id = c.rol_id;
  raise notice 'web.cola.participar concedido a los roles: %', coalesce(v_nuevos, '(ninguno nuevo)');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- El único punto de verdad: ¿esta persona puede estar en la rueda?
-- ---------------------------------------------------------------------------------------------------
create or replace function public.puede_estar_en_la_rueda(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = p_usuario and p.activo and not p.bloqueado)
     and exists (select 1 from public.usuarios_roles ur
                   join public.roles_permisos rp on rp.rol_id = ur.rol_id and rp.permiso_clave = 'web.cola.participar'
                  where ur.usuario_id = p_usuario);
$$;
revoke all on function public.puede_estar_en_la_rueda(uuid) from public, anon;
grant execute on function public.puede_estar_en_la_rueda(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Reasignar al vencer: sólo a quien puede estar en la rueda.
-- ---------------------------------------------------------------------------------------------------
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
      where q.habilitado and q.disponible and p.whatsapp_web is not null and public.puede_estar_en_la_rueda(q.usuario_id)
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

-- ---------------------------------------------------------------------------------------------------
-- Solicitar asesor: la abierta (3), el pegajoso (4) y la rueda (5) preguntan por la misma regla.
-- ---------------------------------------------------------------------------------------------------
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
  -- 3) ya tiene una abierta: la misma. El reloj vuelve a cero sólo si quien la tiene puede estar en la rueda: si no, vence a su hora y se reasigna.
  select x.* into s from public.solicitudes_contacto_web x where x.token_visitante = p_token and x.estado = 'asignada' and not x.es_directa order by x.creado_en desc limit 1;
  if s.id is not null then
    if public.puede_estar_en_la_rueda(s.usuario_id) then
      update public.solicitudes_contacto_web set vence_en = now() + ttl where id = s.id;
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

-- ---------------------------------------------------------------------------------------------------
-- La lista de la rueda: sólo quien puede estar en ella.
-- ---------------------------------------------------------------------------------------------------
create or replace view public.estado_cola_web with (security_invoker = true) as
select q.usuario_id, p.nombre, p.handle, q.habilitado, q.disponible, q.prioridad, q.orden, coalesce(q.max_abiertas, w.max_abiertas_default) as cupo,
       (select count(*) from public.solicitudes_contacto_web s where s.usuario_id = q.usuario_id and s.estado = 'asignada' and not s.es_directa) as abiertas,
       q.asignadas_total, q.contactadas_total, q.vencidas_total,
       case when q.asignadas_total > 0 then round(100.0 * q.contactadas_total / q.asignadas_total, 1) end as tasa_contacto_pct,
       q.ultima_asignacion_en
from public.cola_web_asesores q join public.perfiles p on p.id = q.usuario_id cross join public.ajustes_web w
where w.id = 1 and p.activo and public.puede_estar_en_la_rueda(q.usuario_id);
grant select on public.estado_cola_web to authenticated;
