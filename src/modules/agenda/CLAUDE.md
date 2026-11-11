# agenda

Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización.

## Entra y sale

- Entra: alta desde la agenda, desde el chat (`/tarea`, `/evento`) y desde la ficha del lead (recordatorios); fechas de subasta de `vehiculos`.
- Sale: `agendaDe(usuario, rango)` unificada, `crearTarea()`, `reasignarTarea()`, `<ChipEvento>`. Lo consumen `chat`, `tablero`, `notificaciones` (cron de recordatorios).
- Depende de: `leads`, `vehiculos`, `cotizaciones`, `chat` (la conversación donde nace una tarea).

## Archivos clave

- `entities/visibilidad.ts` — privado / público / seleccionados y quién puede reasignar una tarea (de chat vs suelta).
- `infra/queries/agenda.ts` — una consulta por rango que une eventos, tareas, recordatorios y subastas (sin N+1).
- `features/calendario/` (mes/semana/día), `features/eventos/`, `features/tareas/`.

## Tablas

`eventos` (con `lead_id`, `vehiculo_id`, `cotizacion_id`), `eventos_destinatarios`, `tareas` (con `lead_id`, `vehiculo_id`, `cotizacion_id` y
`conversacion_id`); lee `recordatorios` (leads) y `vehiculos.cierre_subasta_en`. Las tres se escriben **sólo por RPC** (7.06-1): sin policies ni
grants de escritura; la versión (`actualizado_en`) la mueve `agenda_version()`, también dos veces en una transacción.
RPC: `evento_crear` y `tarea_crear` (id del navegador); `evento_guardar`, `evento_eliminar`, `tarea_guardar`, `tarea_completar`,
`tarea_eliminar` y `reasignar_tarea` (con `p_actualizado_en_esperado`, PT409). Responden `{resultado, id, actualizado_en}`. Triggers:
`tarea_notificar` (avisa `tarea_asignada`), `tarea_validar`; cron: `recordatorios_notificar`.
Lecturas (7.06-2): `agenda_rango(p_desde, p_hasta, p_de_todos)` (de invocador; ≤ 45 días; eventos, tareas, recordatorios y subastas, sólo lo de
un chip, 200 por clase con `hay_mas` y `tope`). Índice `tareas_vence_idx` (la ruta de `agenda.ver_todo`).

## No se rompe

- Una tarea la ven su responsable, su creador, quien tiene `agenda.ver_todo` y, si nació en el chat, los miembros de esa conversación
  (`tareas.conversacion_id`, que fija `tarea_crear`; no la ficha compartida después en otro chat).
- Una tarea la edita, la elimina y la reasigna su creador (reasignar, con `agenda.tareas.asignar`); el responsable sólo la completa y la reabre.
  Darla a otro exige `agenda.tareas.asignar` y que quien la recibe esté activo, sin bloqueo y con `agenda.tareas.recibir`; si nació en el chat,
  que sea miembro. No vence en el pasado. `responsable_id` sólo cambia por `reasignar_tarea`. Completar, eliminar o reasignar accionan la
  `tarea_asignada` abierta del responsable (del anterior, al reasignar).
- Un evento vivo lo leen su creador, todos si es público, sus destinatarios y quien tiene `agenda.ver_todo`. `eventos: leer` es **en línea** sobre
  columnas (7.06-2), con `_agenda_soy_destinatario(id)` (definer, de authenticated: la evalúa la policy); `puede_evento` queda para
  `eventos_destinatarios: leer` y `evento_guardar`. No vuelvas a llamar a `puede_evento(id)` desde la policy: relee la fila por cada evento.
- Un evento lo edita y lo elimina sólo quien lo creó; uno público o «seleccionados» exige `agenda.eventos.publicar` al crear, en todo guardar
  y al eliminar. Destinatarios sólo en «seleccionados»: de 1 a 50, activos; cada nuevo recibe `evento_invitacion`.
- Las subastas no se duplican como eventos: se proyectan desde el vehículo en la consulta.
- «Mi agenda» (`agenda_rango` sin `p_de_todos`): eventos que creé, públicos o donde soy destinatario; tareas de las que soy responsable (no las
  que di); mis recordatorios pendientes; las subastas que la RLS de vehículos me deja ver. Con `p_de_todos` (`agenda.ver_todo`): todos los eventos y
  las tareas con fecha. Los recordatorios ajenos no se leen nunca. Cada cosa entra por su fecha de inicio, vencimiento, hora o cierre.
- Fechas en UTC en la base; se muestran en la zona de la empresa con `formato.ts`.

## Ojo

- `tarea_validar` (trigger) sólo mira `agenda.tareas.recibir` al crear; el vencimiento en el pasado y la baja o el bloqueo de quien recibe los
  frenan las RPC (`_agenda_puede_recibir`).
- El recordatorio es del lead (módulo `leads`); la agenda sólo lo muestra y lo marca como hecho por RPC.
