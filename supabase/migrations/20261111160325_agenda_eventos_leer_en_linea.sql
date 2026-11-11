-- `eventos: leer` en línea (paso 7.06-2, C1, D21). La policy de antes llamaba a `puede_evento(eventos.id)`: como nombra una columna no es InitPlan y,
-- por cada evento, volvía a leer la fila por PK, sus destinatarios y `tiene_permiso()` sin envolver. Con un rango de calendario son cientos de filas.
--
-- Ahora compara columnas de la fila, `tiene_permiso('agenda.ver_todo')` envuelto (una vez por consulta) y el destinatario por la PK de
-- `eventos_destinatarios` con `_agenda_soy_destinatario(id)`, definer para no pagar la RLS de esa tabla por fila (que a su vez llama a `puede_evento`).
-- Mismo conjunto de lectores que `puede_evento`: vivo y (creador, público, agenda.ver_todo o destinatario). `puede_evento` queda para
-- `eventos_destinatarios: leer` y `evento_guardar`.

create function public._agenda_soy_destinatario(p_evento uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select exists (select 1 from public.eventos_destinatarios d where d.evento_id = p_evento and d.usuario_id = (select auth.uid()));
$$;

comment on function public._agenda_soy_destinatario(uuid) is 'Si quien llama es destinatario del evento (por la PK de eventos_destinatarios). Definer para que `eventos: leer` no pague la RLS de los destinatarios por fila; sólo responde por quien llama (paso 7.06-2).';

revoke all on function public._agenda_soy_destinatario(uuid) from public, anon;
grant execute on function public._agenda_soy_destinatario(uuid) to authenticated, service_role;

drop policy "eventos: leer" on public.eventos;
create policy "eventos: leer" on public.eventos for select to authenticated using (
  eliminado_en is null
  and (
    creado_por = (select auth.uid())
    or visibilidad = 'publico'
    or (select public.tiene_permiso('agenda.ver_todo'))
    or public._agenda_soy_destinatario(id)
  )
);
