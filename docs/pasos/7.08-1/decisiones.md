## 2026-11-11 — Paso 7.08-1: conversaciones y membresía del chat (parte 1 de 3 del 7.08)

- **D1 · El 7.08 se parte en tres** por capa de la base: 7.08-1 conversaciones y membresía, 7.08-2 mensajes y menciones, 7.08-3 lecturas paginadas
  y no leídos.
- **D2 · `par_directo` es un `uuid[]` ordenado que puede quedar nulo.** Una directa vieja duplicada queda con nulo: sus miembros la siguen leyendo,
  pero `chat_directa` no la devuelve. No se fusionan conversaciones en una migración.
- **D3 · La regla del canal global vive en `es_miembro()`,** no en cada policy: un solo lugar corta la lectura, la escritura de mensajes y lo que la
  agenda pasa por ahí (`tareas: leer`, `tarea_crear`, `agenda_quienes_reciben`, `_agenda_tarea_tomar`). Quien pierde `chat.global` y no es
  responsable ni creador de una tarea del canal deja de verla y de tocarla.
- **D4 · Con quien no puede usar el chat** (de baja, bloqueado o sin `chat.participar`) no se abre una directa ni se lo suma a un grupo.
- **D5 · Una directa no se deja; se silencia.**
- **D6 · El grupo lo administra quien lo creó** (duda 3 de la fila). Si sale, nadie lo administra y el grupo sigue.
- **D7 · `chat_grupo_miembros`, `chat_leer` y `chat_silenciar` van sin versión:** son idempotentes y no pisan nada. La versión de `conversaciones` la
  movería cada mensaje y daría PT409 falsos. Hay que sumarlas a las excepciones de `.claude/rules/migraciones.md` (lo hace el coordinador).
- **D8 · Un grupo tiene de 2 a 50 personas** (el tope de destinatarios de un evento) y un nombre de 1 a 80 caracteres.
- **D9 · `chat_leer` recibe hasta dónde se leyó** y no lee `mensajes`: un mensaje de otra transacción con hora anterior no queda leído sin verse.
- **D10 · `ultimo_mensaje_en` lo mueve un trigger,** no cada RPC: lo cubre todo camino que inserte un mensaje. En el canal global los envíos se
  serializan en el tramo corto del `update`.
- **D11 · El canal global se siembra en la migración** (la nube no corre el seed) con el nombre del seed, «Equipo».
- **D12 · La publicación de realtime se toca en un bloque `do`** que mira `pg_publication`: PGlite no la tiene y la migración queda idempotente.
- **D13 · `aplicado_en` de `chat.*` no se toca:** vive en `seed.sql` (carril a).
- **D14 · Sin prueba de carreras** (duda 4 de la fila): la directa la cuida el índice único y `chat_directa` relee si pierde.
- **D15 · Las RPC responden `{resultado, id}`** (más `ultimo_leido_en` en `chat_leer`); ninguna expone versión.
- **D16 · Entrar al canal global no pide `chat.participar`:** se puede leer sin escribir.
- **D17 · Los docs de la parte van en `docs/pasos/7.08-1/`;** la partición en `docs/PLAN.md` la anota el coordinador.
- **D18 · La dueña no lee conversaciones donde no es miembro** (a propósito); ninguna RPC le da un atajo.
- **D19 · `conversaciones_miembros` va a realtime como pide la fila,** sabiendo que Realtime no aplica RLS a los DELETE: un suscriptor recibe la
  clave `(conversacion_id, usuario_id)` de quien sale de una conversación ajena (sólo uuids). Se acepta; regla para 7.09: suscribirse sólo a INSERT
  y UPDATE filtrados por `usuario_id=eq.<yo>`.
