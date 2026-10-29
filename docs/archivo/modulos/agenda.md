# agenda

Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización.

## Entra y sale

- Entra: alta desde la agenda, desde el chat (`/tarea`, `/evento`) y desde la ficha del lead (recordatorios); fechas de subasta de `vehiculos`.
- Sale: `agendaDe(usuario, rango)` unificada, `crearTarea()`, `reasignarTarea()`, `<ChipEvento>`. Lo consumen `chat`, `tablero`, `notificaciones` (cron de recordatorios).
- Depende de: `leads`, `vehiculos`.

## Archivos clave

- `entities/visibilidad.ts` — privado / público / seleccionados y quién puede reasignar una tarea (de chat vs suelta).
- `infra/queries/agenda.ts` — una consulta por rango que une eventos, tareas, recordatorios y subastas (sin N+1).
- `features/calendario/` (mes/semana/día), `features/eventos/`, `features/tareas/`.

## Tablas

`eventos`, `eventos_destinatarios`, `tareas`; lee `recordatorios` (leads) y `vehiculos.subasta_en`.
RPC: `reasignar_tarea`, `tarea_notificar` (trigger), `recordatorios_notificar` (cron).

## No se rompe

- Una tarea la ven su responsable, su creador y, si nació en el chat, los miembros de esa conversación. `asignado_a` sólo cambia por `reasignar_tarea`.
- Las subastas no se duplican como eventos: se proyectan desde el vehículo en la consulta.
- Fechas en UTC en la base; se muestran en la zona de la empresa con `formato.ts`.

## Ojo

- `tarea_validar` impide vencimientos en el pasado al crear y reasignar a alguien bloqueado.
- El recordatorio es del lead (módulo `leads`); la agenda sólo lo muestra y lo marca como hecho por RPC.
