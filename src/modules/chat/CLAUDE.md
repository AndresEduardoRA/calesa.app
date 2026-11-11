# chat

Mensajería interna: conversaciones directas (deduplicadas), grupos y canal global por permiso, menciones `#` de vehículos/leads/cotizaciones/personas, tareas y eventos desde el mensaje, realtime.

## Entra y sale

- Entra: mensajes del usuario, comandos `/tarea` y `/evento`, menciones; señales realtime de Supabase.
- Sale: `abrirConversacionCon(usuarioId)` (CTA «contactar al dueño del lead»), `<WidgetChat>`, `noLeidos()`. Lo consumen `leads` (CTA), `app/` (widget), `tablero`.
- Depende de: `agenda` (tareas/eventos), `vehiculos`, `leads`, `cotizaciones` (fichas de mención).

## Archivos clave

- `entities/menciones.ts` — parser de `#` y `/comando`, puro; `entities/visibilidad.ts` — quién ve qué (membresía es el eje).
- `infra/realtime.client.ts` — canal por conversación; la fila es señal, se rehidrata por fetch.
- `features/conversaciones/`, `features/mensajes/`, `features/widget/`.

## Tablas

`conversaciones` (`par_directo`: el par ordenado de una directa, único parcial; `ultimo_mensaje_en`, que mueve el trigger
`trg_chat_ultimo_mensaje` en cada mensaje insertado y nunca retrocede), `conversaciones_miembros` (en `supabase_realtime`), `mensajes`,
`mensajes_menciones`. Trigger `mensaje_editar_validar`. El canal global «Equipo» lo siembra la migración (7.08-1).

RPC (`security definer`, desde 7.08-1): `chat_directa`, `chat_global_entrar`, `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`,
`chat_leer` y `chat_silenciar`. Pruebas en `supabase/tests/areas/chat/`.

## No se rompe

- Toda la RLS del chat gira sobre `conversaciones_miembros`; el dueño **no** ve conversaciones donde no es miembro (deliberado).
- Una mención no otorga acceso: si no puedo ver el lead, veo un placeholder.
- Directa = exactamente 2 miembros, una por par: `chat_directa` y el índice único de `par_directo` (A→B y B→A son la misma). Una directa no se deja.
- `es_miembro()` es la puerta: fila de miembro y, en el canal global, `chat.global` vigente. Toda función definer decide la membresía de quien
  llama con `es_miembro()`, nunca con la fila suelta de `conversaciones_miembros` (si no, el global se reabre a quien perdió el permiso).
- `conversaciones` y `conversaciones_miembros` se escriben sólo por sus RPC (sin policies ni grants de escritura).
- Realtime no aplica RLS a los DELETE de `conversaciones_miembros`: suscribirse sólo a INSERT y UPDATE filtrados por `usuario_id=eq.<yo>`.
- Editar/borrar mensaje: sólo el autor, dentro de la ventana que define `mensaje_editar_validar`.

## Ojo

- El canal global exige `chat.global`; participar en cualquier chat exige `chat.participar`.
- `mensajes.tipo`: texto o ficha (tarea/evento/vehículo/lead/cotización) con exactamente una FK poblada (CHECK).
