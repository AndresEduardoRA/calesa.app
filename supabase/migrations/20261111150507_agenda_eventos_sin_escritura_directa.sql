-- Los eventos de la agenda se escriben sólo por RPC (paso 7.06-1, C1, C2 y C4 de eventos). Esta migración deja la estructura y quita la
-- escritura directa; `evento_crear`, `evento_guardar` y `evento_eliminar` llegan en la siguiente (`…_agenda_eventos_escribir.sql`).
--
-- C1. `eventos.cotizacion_id` (D1: un evento puede ir con una cotización, como ya iban las tareas), con su índice.
-- C2. Sin escritura directa: se van las policies de crear, editar y borrar y los grants de insert, update y delete de `eventos` y
--     `eventos_destinatarios`. Quedan las de leer.
-- C4. La versión (`actualizado_en`) la mueve `agenda_version()`: se mueve aunque haya dos cambios en la misma transacción (`set_actualizado_en()`
--     ponía `now()`, que no cambia dentro de una transacción) y la mueve también un `on delete set null` de un vínculo. La usan también las tareas.

-- C1 · estructura
alter table public.eventos add column cotizacion_id uuid references public.cotizaciones (id) on delete set null;
create index eventos_cotizacion_id_idx on public.eventos using btree (cotizacion_id);

comment on column public.eventos.cotizacion_id is 'La cotización vinculada (opcional). Quien escribe tiene que verla (`puede_cotizacion`, en `evento_crear` y `evento_guardar`).';
comment on table public.eventos is 'Evento de la agenda. Se escribe sólo por RPC (`evento_crear`, `evento_guardar`, `evento_eliminar`); publicar (público o seleccionados) exige agenda.eventos.publicar al crear, al editar y al eliminar.';
comment on table public.eventos_destinatarios is 'Las personas de un evento «seleccionados». Se escribe sólo por `evento_crear` y `evento_guardar` (reemplazo completo, tope 50).';

-- C2 · sin escritura directa
drop policy "eventos: crear" on public.eventos;
drop policy "eventos: editar" on public.eventos;
drop policy "eventos_destinatarios: crear" on public.eventos_destinatarios;
drop policy "eventos_destinatarios: borrar" on public.eventos_destinatarios;

revoke insert, update, delete, truncate, references, trigger on table public.eventos from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.eventos_destinatarios from authenticated;

-- C4 · la versión
create or replace function public.agenda_version() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end;
$$;

revoke all on function public.agenda_version() from public, anon, authenticated;
grant execute on function public.agenda_version() to service_role;
comment on function public.agenda_version() is 'Mueve la versión de un evento o una tarea en cada update, también dos veces en una transacción (7.06-1).';

drop trigger trg_actualizado_en on public.eventos;
create trigger trg_agenda_version before update on public.eventos for each row execute function public.agenda_version();
