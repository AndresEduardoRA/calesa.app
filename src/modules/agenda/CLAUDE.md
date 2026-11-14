# agenda

Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización.

Abierto: **7-4** (`tarea_crear` y `agenda_quienes_reciben` con el canal global; `docs/PENDIENTES.md`).

## Entra y sale

- Entra: alta desde la agenda, desde el chat (`/tarea`, `/evento`) y desde la ficha del lead (recordatorios); fechas de subasta de `vehiculos`.
- `index.ts`: `leerAgenda({ desde, hasta, deTodos })`, `leerEvento`, `leerTarea`, `leerRecordatorio`, `leerMisTareas({ tope })` (para `tablero`),
  `crearTarea()`. `client.ts`: `<ChipEvento>` y, para el chat, el selector de personas, las reglas puras del formulario y la action `completarTarea`.
- Depende de `leads` (action `completarRecordatorio`), `vehiculos`, `cotizaciones`. `chat` depende de `agenda`, no al revés: la conversación de una
  tarea llega por la RPC `mensaje_tarea_crear`.

## Archivos clave

- `entities/visibilidad.ts` — espejo de la base sólo para habilitar o deshabilitar; quién puede recibir lo deciden la base y `agenda_quienes_reciben`.
- `entities/agenda.ts` parsea `agenda_rango` con Zod; `entities/calendario.ts` arma `rangoDe(vista, fecha, zona)` semiabierto con los cortes de día de
  la zona de la empresa (nunca «+24 h»); semanas desde el lunes. Los días cruzan como `YYYY-MM-DD`, los instantes como ISO.
- `entities/edicion.ts` — mismos límites y mensajes que las RPC; manda sólo las claves de `p_datos` que cambiaron.
- `features/paneles/` — todo por URL (`?evento=`, `?tarea=`, `&editar=1`, `?eliminar=`, `?panel=nuevo-evento|nueva-tarea`, `?recordatorio=`),
  diferido. `?de=todos` sólo con `agenda.ver_todo`: sin él se ignora y el interruptor no se dibuja. «Tareas sin fecha»: sección plegable bajo el
  calendario, leída al abrirla.

## Tablas

`eventos` y `tareas` (con `lead_id`, `vehiculo_id`, `cotizacion_id`; `tareas` también `conversacion_id`), `eventos_destinatarios`; lee `recordatorios`
y `vehiculos.cierre_subasta_en`. Se escriben **sólo por RPC** (sin policies ni grants de escritura); `agenda_version()` mueve `actualizado_en`,
también dos veces en una transacción.
RPC: `evento_crear` y `tarea_crear` (id del navegador); `evento_guardar`, `evento_eliminar`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar`,
`reasignar_tarea` (con `p_actualizado_en_esperado`, PT409). Responden `{resultado, id, actualizado_en}`. Triggers: `tarea_notificar`, `tarea_validar`.
Lecturas: `agenda_rango(p_desde, p_hasta, p_de_todos)` (invocador, ≤ 45 días, 200 por clase con `hay_mas`; `tareas_vence_idx` para
`agenda.ver_todo`); `agenda_tareas_sin_fecha` (cursor `(creado_en, id)`, `_acotar_pagina(p_tamano, 20, 50)`, `tareas_sin_fecha_idx`; registro en
`scripts/guardas/areas-b/paginas-en-la-base.ts`); `agenda_quienes_reciben(p_texto, p_conversacion)` (definer, pide `agenda.tareas.asignar`, tope 20).

## No se rompe

- Una tarea la ven su responsable, su creador, quien tiene `agenda.ver_todo` y, si nació en el chat, los miembros de esa conversación
  (`tareas.conversacion_id`; no la ficha compartida después en otro chat).
- La edita, elimina y reasigna su creador; el responsable sólo la completa y la reabre. Darla a otro exige `agenda.tareas.asignar` y que quien recibe
  esté activo, sin bloqueo, con `agenda.tareas.recibir` y, si nació en el chat, sea miembro vigente (`_chat_miembro_vigente`: en el global, con
  `chat.global`; lo miran crear, `agenda_quienes_reciben` y reasignar). No vence en el pasado. `responsable_id` sólo cambia por
  `reasignar_tarea`. Completar, eliminar o reasignar accionan la `tarea_asignada` abierta del responsable (del anterior, al reasignar).
- Un evento vivo lo leen su creador, todos si es público, sus destinatarios y quien tiene `agenda.ver_todo`. `eventos: leer` es **en línea** sobre
  columnas con `_agenda_soy_destinatario(id)`: no llames a `puede_evento(id)` desde la policy (relee la fila por cada evento).
- Un evento lo edita y elimina sólo quien lo creó; uno público o «seleccionados» exige `agenda.eventos.publicar` al crear, guardar y eliminar.
  Destinatarios sólo en «seleccionados»: de 1 a 50, activos; cada nuevo recibe `evento_invitacion`. `evento_guardar` lleva siempre la lista (`[]` si
  no es «seleccionados»).
- Las subastas no se duplican como eventos: se proyectan desde el vehículo en la consulta.
- «Mi agenda»: eventos que creé, públicos o donde soy destinatario; tareas de las que soy responsable (no las que di); mis recordatorios pendientes;
  las subastas que la RLS de vehículos me deja ver. Con `p_de_todos`: todos los eventos y las tareas con fecha. Los recordatorios ajenos no se leen
  nunca.
- El selector lee de `perfiles` sólo `id` y `nombre`; los vínculos no se editan en el panel; una tarea sin vencimiento no sale en el calendario.

## Ojo

- `tarea_validar` sólo mira `agenda.tareas.recibir` al crear; el pasado y la baja o el bloqueo de quien recibe los frenan las RPC
  (`_agenda_puede_recibir`).
- El recordatorio es del lead: la agenda lo muestra y lo completa por la action de `leads` (`recordatorio_completar`).
