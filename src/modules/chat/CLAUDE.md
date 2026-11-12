# chat

Mensajería interna: conversaciones directas (deduplicadas), grupos y canal global por permiso, menciones `#` de vehículos/leads/cotizaciones/personas, tareas y eventos desde el mensaje, realtime.

## Entra y sale

- Entra: mensajes del usuario, comandos `/tarea` y `/evento`, menciones; señales realtime de Supabase.
- Sale: `abrirConversacionCon(usuarioId)` (lo usa la página `/chat?con=<usuario>`, 7.11-2; `leads` no la llama: sólo enlaza con el id de la persona), `<WidgetChat>` y `<NoLeidosDeLaBarra>` por `shell.client.ts` (sólo el layout `(app)`), `noLeidos()`. Lo consumen `leads` (CTA), `app/` (widget y barra lateral), `tablero`.
- Depende de: `agenda` (por `agenda/client.ts`: `SelectorDePersonas`, las reglas puras del formulario de tarea y evento, `leerPersonasParaTarea` y la action `completarTarea`), `vehiculos`, `leads`, `cotizaciones` (fichas de mención) y `buscador` (las lecturas del selector `#`; `leads/client` da `interpretarBusqueda`).

## Archivos clave

- `entities/conversaciones.ts` — la fila de `chat_conversaciones` validada, cursor, fusión de páginas, `textoDeNoLeidos` («99+»), `?c=` (`idDeConversacionEnLaUrl`) y `?con=` (`idDeUsuarioEnLaUrl`); puro.
- `entities/menciones.ts` — el parser del cuerpo (`#[<tipo>:<uuid>]` → texto y menciones, referencias únicas hasta 20, `?mencion=`), puro. Desde 7.10-2 también arma: `consultaAbierta` (el `#` tras el cursor: una palabra sola), `etiquetaDeMencion`/`etiquetaLibre` y `aCuerpoConTokens` (`#Nombre` → `#[clase:id]`; las `menciones` salen del cuerpo final; más de 20 = `demasiadas`).
  Desde 7.10-3, `comandoDelTexto` (`/tarea` o `/evento` al principio del texto, seguido de un blanco o del fin; el resto, cortado en el largo del título, es el título de partida).
  `entities/referencias.ts` — lo que apunta una mención o una ficha ya validado (`visible`, `sin_acceso`, `eliminado`; lo no leído no está en el mapa) y `Mensaje.ficha`; puro.
- Menciones (7.10-1): `infra/referencias.client.ts` lee, con la sesión de quien mira, **una lectura por clase y por tanda de 100** (`leads_vista_por_ids`, `vehiculos`, `cotizaciones`, `perfiles`; sin teléfono, privados ni montos).
  `features/menciones/`: `useReferenciasDelHilo` (sólo lo no resuelto; un fallo deja «No se pudo cargar · Reintentar» en el chip), `ChipDeMencion` (botón si se ve; «No tienes acceso a este lead», «Eliminado»; la persona no abre nada),
  `useMencionPorUrl` (`?mencion=<clase>:<id>`: suma al historial, no toca `?c=` ni `?panel=`; un valor ilegible se limpia) y `DrawerDeMencion` (propio del chat: lo ya leído y «Abrir en Leads|Vehículos|Cotizaciones»; sin acceso, ni datos ni enlace).
- Selector `#` (7.10-2): `features/menciones/hooks/use-busqueda-de-menciones.ts` (250 ms, `AbortController`, `buscarLeads|Vehiculos|Cotizaciones` de `@/modules/buscador/client` en paralelo más `leerPersonas`; `agruparResultados` corta en 5 por clase),
  `components/selector-de-menciones.tsx` (listbox dentro del formulario, con `diferido()`; estados: mínimo, buscando, vacío, error con «Reintentar», parcial) y `use-menciones-en-redactor.ts` (lo elegido, la opción activa, Escape y el teclado: Enter y Tab eligen sólo con opciones).
  `features/mensajes/hooks/use-redactor.ts` lleva el texto, el cursor y el envío; el campo guarda `#Nombre` y el token se arma al enviar (`menciones` por la action y `p_menciones`; reintentar reusa id, cuerpo y menciones; editar manda las del cuerpo).
- Fichas de tarea y evento (7.10-3): `entities/fichas.ts` (filas validadas, `EstadoDeFicha`: `visible`, `no_disponible`, `eliminada`; `puedeCompletarDesdeFicha`, `estaVencida`; puro) e `infra/fichas.client.ts` (una lectura por clase y por tanda de 100 ids más una de `perfiles`: `id, nombre`).
  `features/fichas/`: `useFichasDelHilo` (sólo lo no resuelto; `marcarCompletada` y `releer`), `FichaDelMensaje` (cargando, «No se pudo cargar · Reintentar», «Tarea|Evento no disponible», «Eliminada», visible), `FichaDeTarea` (el responsable ve «Marcar como hecha» o «Reabrir», vía `completarTarea` de agenda) y `FichaDeEvento`.
  Crear: `infra/fichas-escritura.ts` (`mensaje_tarea_crear` y `mensaje_evento_crear`; el `hint` es el campo) y las actions `crearTareaDelChat` y `crearEventoDelChat`. `/tarea` y `/evento` se reconocen **al enviar** (aviso bajo el campo), vacían el campo y abren `?panel=tarea|evento`
  (`usePanelesDeFicha`, `PanelDeTarea`, `PanelDeEvento`, diferidos; el título de partida va en estado y cada apertura es un formulario nuevo). Los invitados se buscan entre los miembros (`infra/miembros.client.ts`).
- `infra/consultas.ts` — la RPC de la lista y la lectura de una conversación (sólo si es mía: fila propia de `conversaciones_miembros`); sus pares
  `conversaciones*.ts` (servidor) y `*.client.ts` (navegador). `infra/realtime.client.ts` — tres señales (`mensajes` sin filtro y mis filas de miembro para la lista; `mensajes` de la conversación abierta
  para el hilo; sin `DELETE`); la fila es señal, se rehidrata por la RPC.
- `entities/{personas,grupos,escritura}.ts` — búsqueda de personas (3 letras, tope 20), límites de un grupo (1 a 49 más quien lo crea), respuesta de las RPC y `puedeSalirDe`; puros.
  `infra/conversaciones-escritura.ts` (las cinco RPC de escritura; el campo del rechazo es el `hint`) y `infra/personas.client.ts`.
- `entities/mensajes.ts` — el mensaje del hilo, fusión por `id` (lo `enviando` y lo `fallido` al final), cabeza con hueco, texto válido (4.000), borde del día de «Ir a una fecha»; puro.
  `infra/mensajes.client.ts` (el hilo se lee en el navegador; la cita del mensaje respondido, en una segunda lectura por pk), `infra/mensajes-escritura.ts` (`mensaje_enviar`, `mensaje_editar`,
  `mensaje_eliminar`, `chat_leer`) y `suscribirseAlHilo`.
- `entities/reglas-del-mensaje.ts` — ventana de edición de 15 minutos desde la creación, quién edita y quién borra (el autor, o `chat.moderar`), la cita (`CitaDeMensaje`, `textoDeCita`); puro.
- `features/conversaciones/` (lista, `actions/`, el menú «Nueva conversación» con sus modales de directa y de grupo y `confirmar-salir`), `features/mensajes/` (hilo, redactor con envío optimista del mismo `id`, «Ver anteriores» hasta el tope, el «⋯»
  de silenciar y salir; responder con cita, editar en línea, borrar por URL y el «⋯» de cada burbuja), `features/widget/` (7.11-1, abajo); la pantalla sale por `pantallas/chat.ts`. `?panel=nueva|grupo|salir|borrar-mensaje` (éste con `mensaje=<id>`) no toca `?c=`.
- Widget flotante (7.11-1): `shell.client.ts` exporta `WidgetChat` (la burbuja, fuera de `/chat`; el layout lo monta por `HuecoChat`, sólo con `chat.participar`) y `NoLeidosDeLaBarra`.
  `features/widget/no-leidos-store.ts` es el contador de la pestaña (valor, `suscribir`, `poner`; sin importar Supabase: viaja en el JS de todas las pantallas) y lo escribe `SuscripcionDeNoLeidos` (diferida; `chat_no_leidos`
  por `infra/no-leidos.client.ts` al descansar el navegador, tras cada señal de `suscribirseALaLista` con 250 ms de espera y al reconectar; un fallo deja el último valor). La burbuja es un botón desde 768 px y un enlace a `/chat` debajo; `z-40`.
  El panel (`PanelDelWidgetDiferido`) se monta sólo abierto: lee la primera página de la lista, elige la conversación por estado local (**el widget no usa la URL**) y compone el hilo sin `?panel=`, `?mencion=` ni borrado por URL
  (`HiloDelWidget`: `useHilo`, `useEnvio`, `useMarcarLeido`, fichas y menciones; `AccionesDelMensaje.sinMenu` quita el «⋯»). Sólo leer y responder: editar, borrar, `/tarea` y `/evento` y menciones llevan a `/chat`.
- `?c=<id>` ilegible = sin selección; sin fila propia = «ya no es mía» (nunca un 404).
- `?con=<usuario>` (7.11-2, el enlace «Escribirle por chat» del alta de leads): la página lo resuelve **antes** de leer la lista con `abrirConversacionCon` (`chat_directa`, idempotente) y `redirigir('/chat?c=<id>')` fuera de todo `try`. Si la base lo niega
  («Esa persona no puede usar el chat.», o uno mismo: «Elige a otra persona del equipo.») la pantalla dice el mensaje en un `<Aviso tono="peligro">` y la lista queda debajo; la `?con=` se queda en la URL. Un `?con=` ilegible se ignora como `?c=`.

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
- Una mención no otorga acceso: si no puedo ver el lead, veo un placeholder. Un lead purgado se lee igual que uno que no veo («No tienes acceso…»): distinguirlos filtraría existencia; «Eliminado» sólo si la fila trae `eliminado_en` o la FK de la ficha quedó nula.
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

- `/tarea` y `/evento` se reconocen al enviar, no al teclear. Un evento con invitados es «para seleccionados» y la base lo exige con `agenda.eventos.publicar`: sin ese permiso nace **privado y sin invitados**, y los demás miembros leen «Evento no disponible». La ficha de una tarea no se refresca por Realtime: si otra persona la completa, se ve al releer el hilo. `?panel=tarea|evento` no toca `?c=`.
- `?mencion=` no es `?panel=`: se lee con `useQueryState` y no cierra ni cambia la conversación abierta. Editar un mensaje con tokens los muestra tal cual en el editor; `editar` manda `p_menciones` con las que quedan en el texto (borrar un token a mano la quita). El campo del redactor es un `<textarea>` plano: `#Nombre` no se protege como bloque y, si se edita, queda como texto sin mención.
- La señal de `mensajes` de la lista incluye lo propio (mueve mi fila); el hilo relee los 20 más nuevos y funde por `id`. «No enviado · Reintentar» reusa el `id`: la base responde `repetido`.
- Editar y borrar esperan a la base y la señal `UPDATE` los refleja; un mensaje más viejo que los 20 más nuevos no se refresca en la otra sesión. `mensajes → mensajes` no se embebe en PostgREST (400 o arreglo): la cita se lee aparte.
- El canal global exige `chat.global`; participar en cualquier chat exige `chat.participar`.
- No leídos = mensajes de otros entre las 100 entradas más nuevas posteriores a tu lectura; 100 se muestra «99+». Enviar no mueve tu lectura:
  la pantalla llama `chat_leer`.
- `mensajes.tipo`: texto o ficha (tarea/evento/vehículo/lead/cotización) con la FK de su tipo (CHECK). La de vehículo, lead o cotización
  puede quedar nula: es `on delete set null` y las papeleras borran de verdad (la pantalla dice «ya no existe»).
- El `repetido` de `mensaje_enviar`, `mensaje_tarea_crear` y `mensaje_evento_crear` se responde antes de mirar `es_miembro`: quien salió recibe
  `repetido` por un mensaje suyo. Sólo devuelve datos propios (id, `creado_en`, `tarea_id`/`evento_id`).
