# agenda

Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización.

## Entra y sale

- Entra: alta desde la agenda, desde el chat (`/tarea`, `/evento`) y desde la ficha del lead (recordatorios); fechas de subasta de `vehiculos`.
- Sale: `agendaDe(usuario, rango)` unificada, `crearTarea()`, `reasignarTarea()`, `<ChipEvento>`. Lo consumen `chat`, `tablero`, `notificaciones` (cron de recordatorios).
- Depende de: `leads`, `vehiculos`, `cotizaciones`.

## Archivos clave

- `entities/visibilidad.ts` — privado / público / seleccionados y quién puede reasignar una tarea (de chat vs suelta).
- `infra/queries/agenda.ts` — una consulta por rango que une eventos, tareas, recordatorios y subastas (sin N+1).
- `features/calendario/` (mes/semana/día), `features/eventos/`, `features/tareas/`.

## Tablas

`eventos` (con `lead_id`, `vehiculo_id`, `cotizacion_id`), `eventos_destinatarios`, `tareas`; lee `recordatorios` (leads) y
`vehiculos.cierre_subasta_en`. Los eventos se escriben **sólo por RPC** (7.06-1): sin policies ni grants de escritura; su versión (`actualizado_en`)
la mueve `agenda_version()`, también dos veces en una transacción.
RPC: `evento_crear` (id del navegador), `evento_guardar` y `evento_eliminar` (con `p_actualizado_en_esperado`, PT409), `reasignar_tarea`,
`tarea_notificar` (trigger), `recordatorios_notificar` (cron). Responden `{resultado, id, actualizado_en}`.

## No se rompe

- Una tarea la ven su responsable, su creador y, si nació en el chat, los miembros de esa conversación. `asignado_a` sólo cambia por `reasignar_tarea`.
- Un evento lo edita y lo elimina sólo quien lo creó; uno público o «seleccionados» exige `agenda.eventos.publicar` al crear, en todo guardar
  y al eliminar. Destinatarios sólo en «seleccionados»: de 1 a 50, activos; cada nuevo recibe `evento_invitacion`.
- Las subastas no se duplican como eventos: se proyectan desde el vehículo en la consulta.
- Fechas en UTC en la base; se muestran en la zona de la empresa con `formato.ts`.

## Ojo

- `tarea_validar` impide vencimientos en el pasado al crear y reasignar a alguien bloqueado.
- El recordatorio es del lead (módulo `leads`); la agenda sólo lo muestra y lo marca como hecho por RPC.
