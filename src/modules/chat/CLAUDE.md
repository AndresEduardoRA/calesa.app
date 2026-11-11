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
`trg_chat_ultimo_mensaje` en cada mensaje insertado y nunca retrocede; sin índice propio desde 7.08-3: la lista parte de las filas de miembro), `conversaciones_miembros` (en `supabase_realtime`), `mensajes`
(en `supabase_realtime`; hilo por `mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)`; eliminado ⇒ cuerpo nulo, check
`mensajes_eliminado_sin_cuerpo`), `mensajes_menciones`. Trigger `mensaje_editar_validar` (autor y `editado_en` al cambiar el cuerpo de un
mensaje vivo; el borrado no pasa por ahí). El canal global «Equipo» lo siembra la migración (7.08-1).

RPC (`security definer`, desde 7.08-1): `chat_directa`, `chat_global_entrar`, `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`,
`chat_leer` y `chat_silenciar`; desde 7.08-2, `mensaje_enviar`, `mensaje_editar`, `mensaje_eliminar`, `mensaje_tarea_crear` y
`mensaje_evento_crear`; desde 7.08-3, las lecturas `chat_conversaciones` (por cursor `(ultimo_mensaje_en, id)`, 20 y 50 como mucho, con
`no_leidos` y `otro`) y `chat_no_leidos`. Ayudantes sin definer: `_chat_puede_conversar`, `_chat_miembro_vigente` (la regla de `es_miembro` para un tercero),
`_chat_cuerpo`, `_chat_menciones_guardar`. Pruebas en `supabase/tests/areas/chat/`.

## No se rompe

- Toda la RLS del chat gira sobre `conversaciones_miembros`; el dueño **no** ve conversaciones donde no es miembro (deliberado).
- Una mención no otorga acceso: si no puedo ver el lead, veo un placeholder.
- Directa = exactamente 2 miembros, una por par: `chat_directa` y el índice único de `par_directo` (A→B y B→A son la misma). Una directa no se deja.
- `es_miembro()` es la puerta: fila de miembro y, en el canal global, `chat.global` vigente. Toda función definer decide la membresía de quien
  llama con `es_miembro()`, nunca con la fila suelta de `conversaciones_miembros` (si no, el global se reabre a quien perdió el permiso), salvo
  las lecturas en lote `chat_conversaciones` y `chat_no_leidos`, que repiten la regla entera: fila propia y `chat.global` calculado una vez
  (`lista.sql` L1 y L4 prueban la equivalencia). Si la regla cambia, cambia en los tres lugares.
- `conversaciones`, `conversaciones_miembros`, `mensajes` y `mensajes_menciones` se escriben sólo por sus RPC (sin policies ni grants de
  escritura). La membresía de un tercero (aviso, responsable, destinatario) se decide con `_chat_miembro_vigente`, nunca con la fila suelta.
- Una mención va en el texto como `#[<tipo>:<uuid>]`, y el conjunto de tokens del cuerpo es igual al de `p_menciones` (hasta 20). Mencionar o
  mandar en ficha un vehículo, lead o cotización exige verlo. El aviso `mencion` va sin cuerpo a los miembros vigentes, aunque silenciaran.
- Realtime no aplica RLS a los DELETE de `conversaciones_miembros`: suscribirse sólo a INSERT y UPDATE filtrados por `usuario_id=eq.<yo>`.
- Editar: sólo el autor, dentro de 15 minutos, con la versión `coalesce(editado_en, creado_en)`. Eliminar: el autor o quien tiene
  `chat.moderar`, siempre siendo miembro; vacía el cuerpo y borra las menciones; sin versión.
- Una tarea o un evento desde el chat corren la regla de agenda y después la del chat en una transacción; el id del mensaje es idempotente
  con un candado consultivo.

## Ojo

- El canal global exige `chat.global`; participar en cualquier chat exige `chat.participar`.
- No leídos = mensajes de otros entre las 100 entradas más nuevas posteriores a tu lectura; 100 se muestra «99+». Enviar no mueve tu lectura:
  la pantalla llama `chat_leer`.
- `mensajes.tipo`: texto o ficha (tarea/evento/vehículo/lead/cotización) con la FK de su tipo (CHECK). La de vehículo, lead o cotización
  puede quedar nula: es `on delete set null` y las papeleras borran de verdad (la pantalla dice «ya no existe»).
- El `repetido` de `mensaje_enviar`, `mensaje_tarea_crear` y `mensaje_evento_crear` se responde antes de mirar `es_miembro`: quien salió recibe
  `repetido` por un mensaje suyo. Sólo devuelve datos propios (id, `creado_en`, `tarea_id`/`evento_id`).
