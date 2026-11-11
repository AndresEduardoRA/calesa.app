-- Una tarea o un evento creados desde un mensaje (paso 7.08-2, C11 y C12). Las dos `security definer`.
--
-- Reglas:
--   - Pide `chat.participar` y ser miembro vigente de la conversación.
--   - Primero la RPC de agenda con todas sus reglas (`tarea_crear`, `evento_crear` de 7.06) y después la del chat, todo en una transacción: un
--     error deshace la tarea o el evento y su aviso (D12).
--   - Tarea: si el responsable no es quien la crea, tiene que ser miembro vigente (`_chat_miembro_vigente`: en el canal global, con `chat.global`).
--     `tarea_crear` mira sólo la fila de miembro; aquí es más estricto (D14). La `tarea_asignada` la da `tarea_notificar`.
--   - Evento: cada destinatario guardado es miembro vigente. La visibilidad es la de 7.06: privado por defecto (D13).
--   - El id del mensaje viene del navegador y el de la tarea o el evento lo genera el servidor. Un candado consultivo por el id del mensaje deja
--     que un reintento vea el mensaje ya creado en vez de crear una segunda tarea (D11).

-- C11
create or replace function public.mensaje_tarea_crear(p_id uuid, p_conversacion uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); r public.mensajes; v_tarea uuid; v_responsable uuid;
begin
  perform public.assert_permiso('chat.participar');
  if p_id is null then
    raise exception 'Falta el identificador del mensaje.' using errcode = '22023', hint = 'id';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('chat_mensaje:' || p_id::text, 0));
  select * into r from public.mensajes m where m.id = p_id;
  if found then
    if r.autor_id = yo and r.conversacion_id = p_conversacion and r.tipo = 'tarea' then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'tarea_id', r.tarea_id);
    end if;
    raise exception 'No pudimos crear esta tarea. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if p_conversacion is null or not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  v_tarea := (public.tarea_crear(gen_random_uuid(), p_datos, p_conversacion) ->> 'id')::uuid;
  select t.responsable_id into v_responsable from public.tareas t where t.id = v_tarea;
  if v_responsable <> yo and not public._chat_miembro_vigente(p_conversacion, v_responsable) then
    raise exception 'Esa persona no está en la conversación de la tarea.' using errcode = '23514', hint = 'responsable_id';
  end if;
  insert into public.mensajes (id, conversacion_id, autor_id, tipo, tarea_id, creado_en)
  values (p_id, p_conversacion, yo, 'tarea', v_tarea, clock_timestamp());
  return jsonb_build_object('resultado', 'creado', 'id', p_id, 'tarea_id', v_tarea);
end;
$$;
revoke all on function public.mensaje_tarea_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.mensaje_tarea_crear(uuid, uuid, jsonb) to authenticated;

-- C12
create or replace function public.mensaje_evento_crear(p_id uuid, p_conversacion uuid, p_datos jsonb, p_destinatarios uuid[] default '{}') returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); r public.mensajes; v_evento uuid;
begin
  perform public.assert_permiso('chat.participar');
  if p_id is null then
    raise exception 'Falta el identificador del mensaje.' using errcode = '22023', hint = 'id';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('chat_mensaje:' || p_id::text, 0));
  select * into r from public.mensajes m where m.id = p_id;
  if found then
    if r.autor_id = yo and r.conversacion_id = p_conversacion and r.tipo = 'evento' then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'evento_id', r.evento_id);
    end if;
    raise exception 'No pudimos crear este evento. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if p_conversacion is null or not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  v_evento := (public.evento_crear(gen_random_uuid(), p_datos, coalesce(p_destinatarios, '{}')) ->> 'id')::uuid;
  if exists (select 1 from public.eventos_destinatarios ed
              where ed.evento_id = v_evento and not public._chat_miembro_vigente(p_conversacion, ed.usuario_id)) then
    raise exception 'Esa persona no está en la conversación.' using errcode = '23514', hint = 'destinatarios';
  end if;
  insert into public.mensajes (id, conversacion_id, autor_id, tipo, evento_id, creado_en)
  values (p_id, p_conversacion, yo, 'evento', v_evento, clock_timestamp());
  return jsonb_build_object('resultado', 'creado', 'id', p_id, 'evento_id', v_evento);
end;
$$;
revoke all on function public.mensaje_evento_crear(uuid, uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.mensaje_evento_crear(uuid, uuid, jsonb, uuid[]) to authenticated;
