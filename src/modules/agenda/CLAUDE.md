# agenda

Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización.

**Fase 7 cerrada el 2026-11-12** (7.14): R1 de `e2e/fase-7-recorrido.spec.ts` (la tarea dada con `/tarea` en el chat). Abierto que la toca: **7-4** (`tarea_crear` y `agenda_quienes_reciben` con el canal global; `docs/PLAN.md` › «Fase 7»).

## Entra y sale

- Entra: alta desde la agenda, desde el chat (`/tarea`, `/evento`) y desde la ficha del lead (recordatorios); fechas de subasta de `vehiculos`.
- Sale: `leerAgenda({ desde, hasta, deTodos })`, `leerEvento(id, yo)` y `leerTarea(id)` (el detalle por id; `index.ts`, con las reglas puras del calendario), `<ChipEvento>` (`client.ts`), `leerRecordatorio(id)` y `leerMisTareas({ tope })` (la bandeja de `tablero`; `estaVencida()`), `crearTarea()`; el chat usa por `client.ts` el `SelectorDePersonas`, `leerPersonasParaTarea(texto, conversacion?)`, las reglas puras del formulario (`validarTarea`, `datosDeTareaNueva`, `validarEvento`, `datosDeEventoNuevo`, `destinatariosDeEvento`) y la action `completarTarea` (la RPC decide quién completa; 7.10-3); las actions de crear, guardar, eliminar, completar y reasignar una tarea las usa la propia pantalla. Lo consumen `chat`, `tablero`, `notificaciones` (cron de recordatorios).
- Pantalla: `pantallas/agenda.ts` (`CalendarioDeAgenda`, `EsqueletoDeCalendario`, `PanelesDeAgenda`), sólo `src/app/(app)/agenda`.
- Depende de: `leads` (la action `completarRecordatorio`, por su `client.ts`), `vehiculos`, `cotizaciones`. `chat` depende de `agenda`, no al revés: la conversación de una tarea llega por la RPC `mensaje_tarea_crear`.

## Archivos clave

- `entities/visibilidad.ts` — espejo de la base para habilitar o deshabilitar (7.06-2): quién ve un evento, cuándo guardar pide
  `agenda.eventos.publicar`, quién edita, completa y reasigna una tarea; `TOPE_DE_DESTINATARIOS`, `DIAS_MAXIMOS_DEL_RANGO`. Que una tarea del chat
  vaya sólo a sus miembros (D3) y quién puede recibir lo dicen la base y `agenda_quienes_reciben`, no este archivo.
- `entities/agenda.ts` — las cuatro clases (`CLASES_DE_AGENDA`, nombre y plural), el esquema Zod que **parsea** lo que devuelve `agenda_rango` y lo pasa a
  camelCase (`leerAgendaDeRango`, un valor de error si no encaja) y `entradasDeAgenda` (las cuatro aplanadas a lo que dibuja un chip; la subasta lleva ruta a su vehículo y, con `rutaDe`, el evento, la tarea y el recordatorio a su panel).
- `entities/calendario.ts` — puro: `VISTAS`, semanas que empiezan el lunes (`PRIMER_DIA_DE_LA_SEMANA`), `rangoDe(vista, fecha, zona)` semiabierto con los
  cortes de día de la zona de la empresa (nunca «+24 h»), `agruparPorDia`, `moverFecha`, títulos en español con `Intl` y `leerVista`/`leerFecha`/`leerClases`
  de la URL. Los días cruzan como `YYYY-MM-DD` y los instantes como ISO.
- `infra/queries/agenda.ts` — una llamada por pantalla a `agenda_rango` (sin N+1); `composicion.ts` la entrega como `leerAgenda`.
- `features/calendario/` — `CalendarioDeAgenda` (Server Component) con la barra (`useParametrosDeAgenda`: `?vista=`, `?fecha=`, `?ver=`, `?de=`), el filtro de
  clases, `VistaDeMes`/`VistaDeSemana` (grilla desde 768 px, lista por día en el celular con `UnaSolaVista`) y `VistaDeDia`. `?de=todos` sólo vale con
  `agenda.ver_todo`: sin él se ignora y el interruptor no se dibuja. Los chips llevan la clase con texto, no sólo color.
- `entities/edicion.ts` — puro: valores de partida, validación (mismos límites y mensajes que `evento_*` y `tarea_*`) y qué claves de `p_datos` cambiaron; `entities/detalle.ts`
  (el detalle y su mapeo; la lista de destinatarios sólo para quien creó el evento), `entities/escritura.ts` (la respuesta de las RPC y los repositorios), `entities/personas.ts`.
- `infra/queries/detalle.ts`, `infra/eventos.ts`, `infra/tareas.ts` (RPC con la sesión de quien actúa) y `infra/personas.client.ts` (el selector; `composicion.client.ts`).
- `features/eventos/`, `features/tareas/` — actions (`crear`, `guardar`, `eliminar`), formularios, detalle y `<Confirmar>` de cada uno; `features/personas/` — el selector de personas;
  `features/paneles/` — `PanelesDeAgenda` (por URL: `?evento=`, `?tarea=`, `&editar=1`, `?eliminar=`, `?panel=nuevo-evento|nueva-tarea`; código diferido). `?recordatorio=<id>` abre el panel del recordatorio.
- Completar y reasignar (7.07-3): `features/tareas/hooks/use-acciones-de-tarea.ts` (comparten conflicto y «en curso»), el pie de `panel-de-tarea.tsx` (`Marcar como hecha` / `Reabrir`) y el despliegue
  `reasignar-tarea.tsx` (selector de una persona, sin URL propia). «Tareas sin fecha»: `features/tareas/components/tareas-sin-fecha.tsx` (la sección plegable bajo el calendario; la lista viaja
  diferida y se lee al abrirla) con `entities/sin-fecha.ts` e `infra/sin-fecha.client.ts`. Recordatorio: `entities/recordatorio.ts`, `infra/queries/recordatorio.ts` y
  `features/recordatorios/` (el panel; «Completar» usa la action de `leads`). Bandeja: `entities/mis-tareas.ts` e `infra/queries/mis-tareas.ts`.

## Tablas

`eventos` (con `lead_id`, `vehiculo_id`, `cotizacion_id`), `eventos_destinatarios`, `tareas` (con `lead_id`, `vehiculo_id`, `cotizacion_id` y
`conversacion_id`); lee `recordatorios` (leads) y `vehiculos.cierre_subasta_en`. Las tres se escriben **sólo por RPC** (7.06-1): sin policies ni
grants de escritura; la versión (`actualizado_en`) la mueve `agenda_version()`, también dos veces en una transacción.
RPC: `evento_crear` y `tarea_crear` (id del navegador); `evento_guardar`, `evento_eliminar`, `tarea_guardar`, `tarea_completar`,
`tarea_eliminar` y `reasignar_tarea` (con `p_actualizado_en_esperado`, PT409). Responden `{resultado, id, actualizado_en}`. Triggers:
`tarea_notificar` (avisa `tarea_asignada`), `tarea_validar`; cron: `recordatorios_notificar`.
Lecturas (7.06-2): `agenda_rango(p_desde, p_hasta, p_de_todos)` (de invocador; ≤ 45 días; eventos, tareas, recordatorios y subastas, sólo lo de
un chip, 200 por clase con `hay_mas` y `tope`). Índice `tareas_vence_idx` (la ruta de `agenda.ver_todo`).
`agenda_tareas_sin_fecha(p_tamano, p_antes_en, p_antes_id)` (de invocador; mis tareas sin fecha y no canceladas, cursor `(creado_en, id)`,
`_acotar_pagina(p_tamano, 20, 50)`, `tareas_sin_fecha_idx`). Su registro está en `scripts/guardas/areas-b/paginas-en-la-base.ts`.
`agenda_quienes_reciben(p_texto, p_conversacion)` (definer; pide `agenda.tareas.asignar`; busca como Equipo, ≥ 3 letras o dígitos; sólo quien
puede recibir y, con conversación, sus miembros; `{personas: [{id, nombre}], hay_mas}`, tope 20).

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
- El selector de destinatarios lee `perfiles` (sólo `id` y `nombre`, nunca el correo); los vínculos de un evento o una tarea se muestran y no se editan en el panel; el vencimiento de una
  tarea es opcional (una tarea sin fecha no sale en el calendario: vive en «Tareas sin fecha»); `tarea_guardar` nunca lleva `responsable_id`; `evento_guardar` lleva siempre la lista de destinatarios (`[]` si no es «seleccionados»).

## Ojo

- `tarea_validar` (trigger) sólo mira `agenda.tareas.recibir` al crear; el vencimiento en el pasado y la baja o el bloqueo de quien recibe los
  frenan las RPC (`_agenda_puede_recibir`).
- El recordatorio es del lead (módulo `leads`); la agenda lo muestra, abre su panel y lo marca como hecho por la action de `leads` (RPC `recordatorio_completar`).
