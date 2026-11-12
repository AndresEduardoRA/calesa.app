-- El tablero de la cola web (paso 8.04-1, C1–C8; cierra la base de 8-1): dos lecturas para quien tiene `web.cola.gestionar`.
--
-- `cola_web_tablero()` lista **todas** las habilitadas de `cola_web_asesores`, estén o no en la rueda: `en_la_rueda` sale de
-- `puede_estar_en_la_rueda()` y `cuenta_activa` va aparte (una cuenta bloqueada no es «su rol no recibe turnos»). Es la lectura propia que 8-1 pide:
-- `estado_cola_web` filtra por la rueda y esconde justo a quien está habilitada sin el permiso. No devuelve el WhatsApp, sólo si falta.
--
-- `cola_web_solicitudes(estado, cursor)` da una página de solicitudes de un estado, la más nueva primero, por cursor `(creado_en, id)` sobre el índice
-- nuevo. El vehículo se nombra con `web.vehiculos` (lo que el visitante vio; nulo si dejó de verse): nada de costos ni VIN. Nunca el token del
-- visitante, la UTM, el lead ni el WhatsApp.
--
-- Las dos son de definidor (leen perfiles ajenos y la vista pública), con `assert_permiso` como primera sentencia, y devuelven `{filas, hay_mas}`.

create index solicitudes_contacto_web_estado_creado_idx on public.solicitudes_contacto_web using btree (estado, creado_en desc, id desc);
comment on index public.solicitudes_contacto_web_estado_creado_idx is 'Las solicitudes de un estado, la más nueva primero: cola_web_solicitudes (8.04-1).';

create function public.cola_web_tablero(p_tope integer default null)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n int;
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_permiso('web.cola.gestionar');
  v_n := public._acotar_pagina(p_tope, 100, 200);
  -- `abiertas` es exacto a propósito: el orden de la rueda que dibuja la app es el espejo del de `web.solicitar_asesor`, que cuenta igual. Lo acota el
  -- cupo de cada persona (≤ 50) y va por solicitudes_web_asesor_abiertas_idx.
  select coalesce(jsonb_agg(jsonb_build_object(
           'usuario_id', t.usuario_id, 'nombre', t.nombre, 'en_la_rueda', t.en_la_rueda, 'cuenta_activa', t.cuenta_activa,
           'falta_whatsapp', t.falta_whatsapp, 'disponible', t.disponible, 'prioridad', t.prioridad, 'orden', t.orden,
           'max_abiertas', t.max_abiertas, 'cupo', t.cupo, 'abiertas', t.abiertas, 'asignadas_total', t.asignadas_total,
           'contactadas_total', t.contactadas_total, 'vencidas_total', t.vencidas_total, 'tasa_contacto_pct', t.tasa_contacto_pct,
           'ultima_asignacion_en', t.ultima_asignacion_en)
           order by t.nombre, t.usuario_id), '[]'::jsonb),
         coalesce(count(*) > v_n, false)
    into v_filas, v_hay
    from (select q.usuario_id, p.nombre,
                 public.puede_estar_en_la_rueda(q.usuario_id) as en_la_rueda,
                 (p.activo and not p.bloqueado) as cuenta_activa,
                 (p.whatsapp_web is null) as falta_whatsapp,
                 q.disponible, q.prioridad, q.orden, q.max_abiertas,
                 coalesce(q.max_abiertas, w.max_abiertas_default) as cupo,
                 (select count(*) from public.solicitudes_contacto_web a
                   where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) as abiertas,
                 q.asignadas_total, q.contactadas_total, q.vencidas_total,
                 case when q.asignadas_total > 0 then round(100.0 * q.contactadas_total / q.asignadas_total, 1) end as tasa_contacto_pct,
                 q.ultima_asignacion_en
            from public.cola_web_asesores q
            join public.perfiles p on p.id = q.usuario_id
            cross join public.ajustes_web w
           where w.id = 1 and q.habilitado
           order by p.nombre, q.usuario_id
           limit v_n + 1) t;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('filas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.cola_web_tablero(integer) is 'Todas las habilitadas de la cola web, con en_la_rueda (puede_estar_en_la_rueda) y cuenta_activa aparte, cupo, abiertas, totales y tasa de contacto; sin el WhatsApp, sólo falta_whatsapp. Pide web.cola.gestionar. p_tope: 100 por defecto, 200 como mucho. {filas, hay_mas}. 8.04-1.';
revoke all on function public.cola_web_tablero(integer) from public, anon;
grant execute on function public.cola_web_tablero(integer) to authenticated, service_role;

create function public.cola_web_solicitudes(
  p_estado public.estado_solicitud_web,
  p_cursor_creado timestamptz default null,
  p_cursor_id uuid default null,
  p_tamano integer default null
)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n int;
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_permiso('web.cola.gestionar');
  if p_estado is null then
    raise exception 'Falta el estado de las solicitudes.' using errcode = '22023', hint = 'estado';
  end if;
  if (p_cursor_creado is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_n := public._acotar_pagina(p_tamano, 20, 50);
  -- Las dos por solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc).
  if p_cursor_creado is null then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id, 'codigo', t.codigo, 'estado', t.estado, 'fuente', t.fuente, 'ruta', t.ruta, 'vehiculo_id', t.vehiculo_id,
             'vehiculo_titulo', (select v.titulo from web.vehiculos v where v.id = t.vehiculo_id),
             'usuario_id', t.usuario_id, 'usuario_nombre', (select p.nombre from public.perfiles p where p.id = t.usuario_id),
             'intento', t.intento, 'asignada_en', t.asignada_en, 'vence_en', t.vence_en, 'creado_en', t.creado_en)
             order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select s.id, s.codigo, s.estado, s.fuente, s.ruta, s.vehiculo_id, s.usuario_id, s.intento, s.asignada_en, s.vence_en, s.creado_en
              from public.solicitudes_contacto_web s
             where s.estado = p_estado
             order by s.creado_en desc, s.id desc limit v_n + 1) t;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id, 'codigo', t.codigo, 'estado', t.estado, 'fuente', t.fuente, 'ruta', t.ruta, 'vehiculo_id', t.vehiculo_id,
             'vehiculo_titulo', (select v.titulo from web.vehiculos v where v.id = t.vehiculo_id),
             'usuario_id', t.usuario_id, 'usuario_nombre', (select p.nombre from public.perfiles p where p.id = t.usuario_id),
             'intento', t.intento, 'asignada_en', t.asignada_en, 'vence_en', t.vence_en, 'creado_en', t.creado_en)
             order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select s.id, s.codigo, s.estado, s.fuente, s.ruta, s.vehiculo_id, s.usuario_id, s.intento, s.asignada_en, s.vence_en, s.creado_en
              from public.solicitudes_contacto_web s
             where s.estado = p_estado and (s.creado_en, s.id) < (p_cursor_creado, p_cursor_id)
             order by s.creado_en desc, s.id desc limit v_n + 1) t;
  end if;
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('filas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.cola_web_solicitudes(public.estado_solicitud_web, timestamptz, uuid, integer) is 'Una página de solicitudes de la web de un estado, la más nueva primero, por cursor (creado_en, id) de la última de la página anterior (a medias: 22023 hint cursor). Título del vehículo desde web.vehiculos; sin token, UTM, lead ni WhatsApp. Pide web.cola.gestionar. p_tamano: 20 por defecto, 50 como mucho. {filas, hay_mas}. 8.04-1.';
revoke all on function public.cola_web_solicitudes(public.estado_solicitud_web, timestamptz, uuid, integer) from public, anon;
grant execute on function public.cola_web_solicitudes(public.estado_solicitud_web, timestamptz, uuid, integer) to authenticated, service_role;

update public.permisos
   set aplicado_en = 'cola_web_configurar, cola_web_tablero, cola_web_solicitudes, web_ajustes_guardar (política de la cola)'
 where clave = 'web.cola.gestionar';
