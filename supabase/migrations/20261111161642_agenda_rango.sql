-- La agenda por rango (paso 7.06-2, C2–C6, D20–D25): `agenda_rango(p_desde, p_hasta, p_de_todos)`, lo que dibuja el calendario en un pedido.
--
-- De invocador (D20): la RLS de cada tabla decide qué se ve y «mi agenda» es un filtro encima. Así las subastas quedan bajo la RLS de vehículos
-- y ningún error de la función filtra una fila.
--   - «Mi agenda» (sin `p_de_todos`): eventos que creé, públicos o donde soy destinatario; tareas de las que soy responsable; mis recordatorios
--     pendientes; las subastas vivas que la RLS me deja ver. Con `p_de_todos` (exige agenda.ver_todo): todos los eventos y todas las tareas con
--     fecha; recordatorios y subastas igual (los recordatorios ajenos no se leen nunca).
--   - Cada cosa entra por su fecha (D23) en [p_desde, p_hasta): el evento por su inicio, la tarea por su vencimiento, el recordatorio por su hora,
--     la subasta por su cierre. Rango obligatorio, en orden y de hasta 45 días.
--   - Una consulta por clase, cada una con su `order by … limit 201` y el índice que la sostiene; nunca un `union all` bajo un `order by` de afuera.
--     Tope 200 por clase (D24): la respuesta dice `tope` y `hay_mas` por clase.
--   - Sólo lo que dibuja un chip (D25): descripción, vínculos y destinatarios los lee el panel por id.

create index tareas_vence_idx on public.tareas using btree (vence_en, id) where eliminado_en is null and vence_en is not null;
comment on index public.tareas_vence_idx is 'Las tareas con fecha de todos por vencimiento: la ruta de agenda.ver_todo de agenda_rango (7.06-2).';

create function public.agenda_rango(p_desde timestamptz, p_hasta timestamptz, p_de_todos boolean default false) returns jsonb
  language plpgsql stable security invoker
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_tope constant int := 200;
  v_todos boolean := coalesce(p_de_todos, false);
  v_eventos jsonb; v_tareas jsonb; v_recordatorios jsonb; v_subastas jsonb;
  v_hay_e boolean; v_hay_t boolean; v_hay_r boolean; v_hay_s boolean;
begin
  perform public.assert_activo();
  if p_desde is null or p_hasta is null then
    raise exception 'Elige el rango de fechas.' using errcode = '22023', hint = 'rango';
  end if;
  if p_hasta <= p_desde then
    raise exception 'El rango termina antes de empezar.' using errcode = '22023', hint = 'rango';
  end if;
  if p_hasta - p_desde > interval '45 days' then
    raise exception 'El rango puede abarcar hasta 45 días.' using errcode = '22023', hint = 'rango';
  end if;
  if v_todos then
    perform public.assert_permiso('agenda.ver_todo');
  end if;

  -- Eventos por eventos_inicio_idx (inicia_en), bajo `eventos: leer`.
  if v_todos then
    select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'inicia_en', e.inicia_en, 'termina_en', e.termina_en,
                                                 'visibilidad', e.visibilidad, 'estado', e.estado, 'mio', e.creado_por = v_yo)
                              order by e.inicia_en, e.id), '[]'::jsonb),
           coalesce(count(*) > v_tope, false)
      into v_eventos, v_hay_e
      from (select x.id, x.titulo, x.inicia_en, x.termina_en, x.visibilidad, x.estado, x.creado_por from public.eventos x
             where x.eliminado_en is null and x.inicia_en >= p_desde and x.inicia_en < p_hasta
             order by x.inicia_en, x.id limit v_tope + 1) e;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'inicia_en', e.inicia_en, 'termina_en', e.termina_en,
                                                 'visibilidad', e.visibilidad, 'estado', e.estado, 'mio', e.creado_por = v_yo)
                              order by e.inicia_en, e.id), '[]'::jsonb),
           coalesce(count(*) > v_tope, false)
      into v_eventos, v_hay_e
      from (select x.id, x.titulo, x.inicia_en, x.termina_en, x.visibilidad, x.estado, x.creado_por from public.eventos x
             where x.eliminado_en is null and x.inicia_en >= p_desde and x.inicia_en < p_hasta
               and (x.creado_por = v_yo or x.visibilidad = 'publico' or public._agenda_soy_destinatario(x.id))
             order by x.inicia_en, x.id limit v_tope + 1) e;
  end if;

  -- Tareas: las mías por tareas_responsable_idx (responsable_id, vence_en); las de todos por tareas_vence_idx (vence_en, id). Bajo `tareas: leer`.
  if v_todos then
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'vence_en', t.vence_en, 'estado', t.estado,
                                                 'responsable_id', t.responsable_id, 'mia', t.creado_por = v_yo)
                              order by t.vence_en, t.id), '[]'::jsonb),
           coalesce(count(*) > v_tope, false)
      into v_tareas, v_hay_t
      from (select x.id, x.titulo, x.vence_en, x.estado, x.responsable_id, x.creado_por from public.tareas x
             where x.eliminado_en is null and x.vence_en >= p_desde and x.vence_en < p_hasta
             order by x.vence_en, x.id limit v_tope + 1) t;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'vence_en', t.vence_en, 'estado', t.estado,
                                                 'responsable_id', t.responsable_id, 'mia', t.creado_por = v_yo)
                              order by t.vence_en, t.id), '[]'::jsonb),
           coalesce(count(*) > v_tope, false)
      into v_tareas, v_hay_t
      from (select x.id, x.titulo, x.vence_en, x.estado, x.responsable_id, x.creado_por from public.tareas x
             where x.responsable_id = v_yo and x.eliminado_en is null and x.vence_en >= p_desde and x.vence_en < p_hasta
             order by x.vence_en, x.id limit v_tope + 1) t;
  end if;

  -- Recordatorios propios y pendientes por recordatorios_usuario_idx (usuario_id, recordar_en). Sin lead: el panel lo lee si se ve.
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en) order by r.recordar_en, r.id), '[]'::jsonb),
         coalesce(count(*) > v_tope, false)
    into v_recordatorios, v_hay_r
    from (select x.id, x.titulo, x.recordar_en from public.recordatorios x
           where x.usuario_id = v_yo and x.completado_en is null and x.eliminado_en is null and x.recordar_en >= p_desde and x.recordar_en < p_hasta
           order by x.recordar_en, x.id limit v_tope + 1) r;

  -- Subastas vivas por vehiculos_cierre_subasta_idx (origen_id, cierre_subasta_en, id): origen por origen de los que tienen vehiculos.ver, cada uno
  -- con su limit; afuera el orden junta a lo sumo orígenes × 201. La RLS de vehículos descarta adentro lo que no se ve (en un origen «propios»,
  -- los ajenos: acotado a las subastas vivas del origen en el rango).
  select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', s.id, 'titulo', s.titulo, 'cierre_subasta_en', s.cierre_subasta_en,
                                               'estado_subasta', s.estado_subasta, 'origen_id', s.origen_id)
                            order by s.cierre_subasta_en, s.id), '[]'::jsonb),
         coalesce(count(*) > v_tope, false)
    into v_subastas, v_hay_s
    from (select v.id, v.titulo, v.cierre_subasta_en, v.estado_subasta, v.origen_id
            from unnest(public.origenes_con_alcance('vehiculos.ver', 'propios')) o(id)
            cross join lateral (
              select y.id, y.titulo, y.cierre_subasta_en, y.estado_subasta, y.origen_id from public.vehiculos y
               where y.origen_id = o.id and y.eliminado_en is null and y.cierre_subasta_en >= p_desde and y.cierre_subasta_en < p_hasta
               order by y.cierre_subasta_en, y.id limit v_tope + 1) v
           order by v.cierre_subasta_en, v.id limit v_tope + 1) s;

  -- La de más no viaja: es sólo el aviso de que hay más.
  if v_hay_e then v_eventos := v_eventos - v_tope; end if;
  if v_hay_t then v_tareas := v_tareas - v_tope; end if;
  if v_hay_r then v_recordatorios := v_recordatorios - v_tope; end if;
  if v_hay_s then v_subastas := v_subastas - v_tope; end if;
  return jsonb_build_object('eventos', v_eventos, 'tareas', v_tareas, 'recordatorios', v_recordatorios, 'subastas', v_subastas,
                            'hay_mas', jsonb_build_object('eventos', v_hay_e, 'tareas', v_hay_t, 'recordatorios', v_hay_r, 'subastas', v_hay_s),
                            'tope', v_tope);
end $$;

comment on function public.agenda_rango(timestamptz, timestamptz, boolean) is 'La agenda en [p_desde, p_hasta) (hasta 45 días; si no, 22023 hint rango): eventos, tareas, recordatorios y subastas, sólo lo que dibuja un chip, 200 por clase como mucho. De invocador: la RLS de cada tabla decide. Sin p_de_todos, «mi agenda»; con él (exige agenda.ver_todo, si no 42501) todos los eventos y tareas. {eventos, tareas, recordatorios, subastas, hay_mas: {…}, tope}. 7.06-2.';
revoke all on function public.agenda_rango(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.agenda_rango(timestamptz, timestamptz, boolean) to authenticated, service_role;
