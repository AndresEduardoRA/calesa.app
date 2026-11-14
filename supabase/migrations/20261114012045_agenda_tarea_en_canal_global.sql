-- Una tarea de una conversación sólo va a un miembro vigente (`_chat_miembro_vigente`): en el canal global la fila de `conversaciones_miembros`
-- no basta, quien la recibe tiene que conservar `chat.global`, como en `mensaje_tarea_crear`. Lo miran crear (`tarea_crear`), ofrecer a quién
-- dársela (`agenda_quienes_reciben`) y reasignarla (`reasignar_tarea`).
-- Prueba: supabase/tests/areas/agenda/tareas-canal-global.sql.

create or replace function public.tarea_crear(p_id uuid, p_datos jsonb, p_conversacion uuid default null::uuid) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare r public.tareas; v public.tareas; yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador de la tarea.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.tareas x where x.id = p_id;
  if found then
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar esta tarea. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v := public._agenda_tarea_datos(v, p_datos);
  v.responsable_id := coalesce(v.responsable_id, yo);
  if v.responsable_id <> yo then
    perform public.assert_permiso('agenda.tareas.asignar');
    if not public._agenda_puede_recibir(v.responsable_id) then
      raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514', hint = 'responsable_id';
    end if;
  end if;
  if p_conversacion is not null then
    if not public.es_miembro(p_conversacion) then
      raise exception 'No estás en esa conversación.' using errcode = '42501', hint = 'conversacion_id';
    end if;
    if not public._chat_miembro_vigente(p_conversacion, v.responsable_id) then
      raise exception 'Esa persona no está en la conversación de la tarea.' using errcode = '23514', hint = 'responsable_id';
    end if;
  end if;
  begin
    insert into public.tareas (id, titulo, descripcion, vence_en, responsable_id, creado_por, lead_id, vehiculo_id, cotizacion_id, conversacion_id, actualizado_en)
    values (p_id, v.titulo, v.descripcion, v.vence_en, v.responsable_id, yo, v.lead_id, v.vehiculo_id, v.cotizacion_id, p_conversacion, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.tareas x where x.id = p_id;
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar esta tarea. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creado', 'id', r.id, 'actualizado_en', r.actualizado_en);
end;
$$;

comment on function public.tarea_crear(uuid, jsonb, uuid) is 'Crea una tarea con el id del navegador. Para otro exige agenda.tareas.asignar y que reciba (activo, sin bloqueo, agenda.tareas.recibir); no vence en el pasado; con p_conversacion, los dos son miembros vigentes (en el canal global, con chat.global). Responde {resultado, id, actualizado_en} (7.06-1).';

create or replace function public.agenda_quienes_reciben(p_texto text, p_conversacion uuid default null::uuid) returns jsonb
    language plpgsql stable security definer
    set search_path to ''
    as $$
declare
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_tope constant int := 20;
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  perform public.assert_permiso('agenda.tareas.asignar');
  if p_conversacion is not null and not public.es_miembro(p_conversacion) then
    raise exception 'No estás en esa conversación.' using errcode = '42501', hint = 'conversacion_id';
  end if;
  if not public._equipo_lista_indexable(v_texto) then
    return jsonb_build_object('personas', '[]'::jsonb, 'hay_mas', false);
  end if;
  -- `perfiles` es la tabla del equipo (decenas de filas, no crece): el patrón la recorre y el limit corta.
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.nombre, q.id), '[]'::jsonb), coalesce(count(*) > v_tope, false)
    into v_filas, v_hay
    from (select p.id, p.nombre from public.perfiles p
           where p.activo and not p.bloqueado
             and public._sin_tildes(p.nombre || ' ' || coalesce(p.email::text, '')) like public._equipo_busqueda_patron(v_texto)
             and (p_conversacion is null or public._chat_miembro_vigente(p_conversacion, p.id))
             and public._agenda_puede_recibir(p.id)
           order by p.nombre, p.id limit v_tope + 1) q;
  if v_hay then v_filas := v_filas - v_tope; end if;
  return jsonb_build_object('personas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.agenda_quienes_reciben(text, uuid) is 'A quién puede darle una tarea quien pregunta: personas activas, sin bloqueo y con agenda.tareas.recibir cuyo nombre o email contiene p_texto (3 letras o dígitos seguidos; si no, lista vacía), y con p_conversacion sólo sus miembros vigentes (en el canal global, con chat.global; quien pregunta tiene que serlo: si no, 42501 hint conversacion_id). Pide agenda.tareas.asignar. {personas: [{id, nombre}], hay_mas}, 20 como mucho. 7.06-2.';

create or replace function public.reasignar_tarea(p_tarea uuid, p_actualizado_en_esperado timestamp with time zone, p_responsable uuid) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare r public.tareas; n public.tareas; yo uuid := (select auth.uid());
begin
  perform public.assert_permiso('agenda.tareas.asignar');
  r := public._agenda_tarea_tomar(p_tarea);
  if r.creado_por is distinct from yo then
    raise exception 'Sólo quien creó la tarea puede reasignarla.' using errcode = '42501';
  end if;
  if p_responsable is null then
    raise exception 'Elige a quién darle la tarea.' using errcode = '22023', hint = 'responsable_id';
  end if;
  if p_responsable = r.responsable_id then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', r.actualizado_en);
  end if;
  if p_responsable <> yo and not public._agenda_puede_recibir(p_responsable) then
    raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514', hint = 'responsable_id';
  end if;
  if r.conversacion_id is not null and not public._chat_miembro_vigente(r.conversacion_id, p_responsable) then
    raise exception 'Esa persona no está en la conversación de la tarea.' using errcode = '23514', hint = 'responsable_id';
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Esta tarea cambió mientras la veías. Recarga para seguir desde la última versión.');
  update public.tareas x set responsable_id = p_responsable where x.id = r.id returning * into n;
  perform public._agenda_tarea_accionar(n.id, r.responsable_id);
  return jsonb_build_object('resultado', 'reasignada', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

comment on function public.reasignar_tarea(uuid, timestamp with time zone, uuid) is 'Reasigna una tarea propia (creador con agenda.tareas.asignar) con su versión (PT409), a alguien que puede recibir y, si nació en el chat, miembro vigente de esa conversación (en el canal global, con chat.global). Responde {resultado, id, actualizado_en} (7.06-1).';
