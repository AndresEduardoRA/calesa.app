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

`conversaciones`, `conversaciones_miembros`, `mensajes`, `mensajes_menciones`. Trigger `mensaje_editar_validar`.

## No se rompe

- Toda la RLS del chat gira sobre `conversaciones_miembros`; el dueño **no** ve conversaciones donde no es miembro (deliberado).
- Una mención no otorga acceso: si no puedo ver el lead, veo un placeholder.
- Directa = exactamente 2 miembros, una por par (lo garantiza la aplicación + índice).
- Editar/borrar mensaje: sólo el autor, dentro de la ventana que define `mensaje_editar_validar`.

## Ojo

- El canal global exige `chat.global`; participar en cualquier chat exige `chat.participar`.
- `mensajes.tipo`: texto o ficha (tarea/evento/vehículo/lead/cotización) con exactamente una FK poblada (CHECK).
