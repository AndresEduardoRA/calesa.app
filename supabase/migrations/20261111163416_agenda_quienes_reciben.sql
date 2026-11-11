-- A quién se le puede dar una tarea (paso 7.06-2, C8, D27): el selector de «Asignar a» y de reasignar.
--
-- Definer: usa `_agenda_puede_recibir` (activa, sin bloqueo y con agenda.tareas.recibir), `_equipo_lista_indexable` y `_equipo_busqueda_patron`,
-- revocadas de authenticated. Pide agenda.tareas.asignar: sólo quien da tareas busca a quién. Devuelve `{id, nombre}`, lo que `perfiles: leer` ya deja
-- leer a toda persona activa.
--   - El texto busca como Equipo (`equipo_lista`): sin tildes, sobre nombre y email, `\ % _` literales; menos de 3 letras o dígitos seguidos, lista vacía.
--   - `p_conversacion` (opcional): la tarea nació en ese chat y sólo puede ir a sus miembros (D3); quien pregunta tiene que ser miembro.
--   - Quien pregunta puede salir: se da una tarea a sí mismo. Tope 20 con `hay_mas`, por nombre.

create function public.agenda_quienes_reciben(p_texto text, p_conversacion uuid default null) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
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
             and (p_conversacion is null
                  or exists (select 1 from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = p.id))
             and public._agenda_puede_recibir(p.id)
           order by p.nombre, p.id limit v_tope + 1) q;
  if v_hay then v_filas := v_filas - v_tope; end if;
  return jsonb_build_object('personas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.agenda_quienes_reciben(text, uuid) is 'A quién puede darle una tarea quien pregunta: personas activas, sin bloqueo y con agenda.tareas.recibir cuyo nombre o email contiene p_texto (3 letras o dígitos seguidos; si no, lista vacía), y con p_conversacion sólo sus miembros (quien pregunta tiene que serlo: si no, 42501 hint conversacion_id). Pide agenda.tareas.asignar. {personas: [{id, nombre}], hay_mas}, 20 como mucho. 7.06-2.';
revoke all on function public.agenda_quienes_reciben(text, uuid) from public, anon;
grant execute on function public.agenda_quienes_reciben(text, uuid) to authenticated, service_role;
