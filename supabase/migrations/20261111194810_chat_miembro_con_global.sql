-- El canal global pide `chat.global` vigente (paso 7.08-1, C5; cierra PLAN:1510 ítem 5 «quien pierde chat.global sigue leyendo»).
--
-- `es_miembro(p)` = hay fila de miembro de quien mira y, si la conversación es el canal global, quien mira tiene `chat.global` (D3). Las
-- policies no cambian: con un solo lugar se cortan la lectura de la conversación, sus miembros, sus mensajes y sus menciones, la escritura
-- de mensajes y lo de la agenda que pasa por aquí (`tareas: leer`, `tarea_crear`, `agenda_quienes_reciben`, `_agenda_tarea_tomar`).
-- Toda función definer decide la membresía de quien llama con `es_miembro()`, nunca con la fila suelta de `conversaciones_miembros`.
-- `case` y no `or`: el permiso se mira sólo en el canal global, sin depender del orden de evaluación.

create or replace function public.es_miembro(p_conversacion uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select exists (
    select 1
      from public.conversaciones_miembros m
      join public.conversaciones c on c.id = m.conversacion_id
     where m.conversacion_id = p_conversacion
       and m.usuario_id = (select auth.uid())
       and case when c.es_global then public.tiene_permiso('chat.global') else true end
  );
$$;
