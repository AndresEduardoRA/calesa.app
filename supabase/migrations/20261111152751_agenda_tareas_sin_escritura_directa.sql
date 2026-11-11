-- Las tareas de la agenda se escriben sólo por RPC (paso 7.06-1, C1–C4 de tareas). Esta migración deja la estructura y quita la escritura
-- directa; `tarea_crear`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar` y `reasignar_tarea` llegan en la siguiente.
--
-- C1. `tareas.conversacion_id` (D4): la conversación donde nació la tarea; la fija `tarea_crear` y no cambia. No se deduce de `mensajes.tarea_id`:
--     una ficha de la tarea compartida después en otro chat no amplía quién la ve.
-- C2. Sin escritura directa: se van las policies de crear y editar y los grants de insert y de update por columna (el revoke de tabla se los lleva).
-- C3. `tareas: leer` suma a los miembros de la conversación donde nació.
-- C4. La versión la mueve `agenda_version()` (de `…_agenda_eventos_sin_escritura_directa.sql`), también dos veces en una transacción.

-- C1 · estructura
alter table public.tareas add column conversacion_id uuid references public.conversaciones (id) on delete set null;
create index tareas_conversacion_id_idx on public.tareas using btree (conversacion_id);

comment on column public.tareas.conversacion_id is 'La conversación donde nació la tarea (`/tarea` del chat); la fija `tarea_crear` y no cambia. Sus miembros la leen.';
comment on table public.tareas is 'Tarea con responsable y vencimiento. Se escribe sólo por RPC (`tarea_crear`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar`, `reasignar_tarea`). Dar una tarea exige agenda.tareas.asignar; recibirla, agenda.tareas.recibir.';

-- C2 · sin escritura directa
drop policy "tareas: crear" on public.tareas;
drop policy "tareas: editar" on public.tareas;
revoke insert, update, delete, truncate, references, trigger on table public.tareas from authenticated;

-- C3 · la conversación de la tarea
drop policy "tareas: leer" on public.tareas;
create policy "tareas: leer" on public.tareas for select to authenticated using (
  eliminado_en is null
  and (
    responsable_id = (select auth.uid())
    or creado_por = (select auth.uid())
    or (select public.tiene_permiso('agenda.ver_todo'))
    or (conversacion_id is not null and public.es_miembro(conversacion_id))
  )
);

-- C4 · la versión
drop trigger trg_actualizado_en on public.tareas;
create trigger trg_agenda_version before update on public.tareas for each row execute function public.agenda_version();
