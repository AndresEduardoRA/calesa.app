# chat

Mensajería interna: conversaciones directas (deduplicadas), grupos y canal global por permiso, menciones `#` de vehículos/leads/cotizaciones/personas, tareas y eventos desde el mensaje, realtime.

Abiertos: **7-3** (el `aplicado_en` de `chat.participar` y `chat.moderar`) y **7-5** (que una suscripción de fondo no avise sin red),
`docs/PENDIENTES.md`.

## Entra y sale

- Entra: mensajes, comandos `/tarea` y `/evento`, menciones; señales realtime.
- Sale: `abrirConversacionCon(usuarioId)` (para `/chat?con=<usuario>`), `noLeidos()`, y por `shell.client.ts` (sólo el layout `(app)`) `<WidgetChat>`
  y `<NoLeidosDeLaBarra>`. Lo consumen `leads` (sólo enlaza con el id de la persona), `app/` y `tablero`. Pantalla: `pantallas/chat.ts`.
- Depende de `agenda` (`agenda/client.ts`: `SelectorDePersonas`, reglas puras de tarea y evento, `leerPersonasParaTarea`, `completarTarea`),
  `vehiculos`, `leads`, `cotizaciones` (fichas de mención) y `buscador` (lecturas del selector `#`; `leads/client` da `interpretarBusqueda`).

## Archivos clave

- `entities/` (todo puro):
  - `conversaciones.ts`: la fila de `chat_conversaciones`, cursor, fusión de páginas, `textoDeNoLeidos` («99+»), `idDeConversacionEnLaUrl` (`?c=`),
    `idDeUsuarioEnLaUrl` (`?con=`).
  - `menciones.ts`: parser de `#[<tipo>:<uuid>]` (referencias únicas hasta 20, `?mencion=`), `consultaAbierta` (el `#` tras el cursor, una palabra),
    `etiquetaDeMencion`/`etiquetaLibre`, `aCuerpoConTokens` (`#Nombre` → `#[clase:id]`; más de 20 = `demasiadas`), `comandoDelTexto` (`/tarea` o
    `/evento` al principio seguido de blanco o fin; el resto, cortado al largo del título, es el título de partida).
  - `referencias.ts` (`visible`, `sin_acceso`, `eliminado`; lo no leído no está en el mapa), `fichas.ts` (`visible`, `no_disponible`,
    `eliminada`), `personas.ts` (3 letras, tope 20), `grupos.ts` (1 a 49 más quien crea), `escritura.ts` (`puedeSalirDe`), `mensajes.ts` (fusión por
    `id` con `enviando` y `fallido` al final, 4.000 caracteres), `reglas-del-mensaje.ts` (quién edita y borra, la cita).
- Menciones: `infra/referencias.client.ts` lee con la sesión de quien mira **una lectura por clase y por tanda de 100** (sin teléfono, privados ni
  montos). `features/menciones/`: `useReferenciasDelHilo` (sólo lo no resuelto), `ChipDeMencion` (la persona no abre nada), `useMencionPorUrl`
  (`?mencion=<clase>:<id>`, suma al historial), `DrawerDeMencion` (sin acceso, ni datos ni enlace).
- Selector `#`: `hooks/use-busqueda-de-menciones.ts` (250 ms, `AbortController`, `@/modules/buscador/client` más `leerPersonas`; 5 por clase),
  `components/selector-de-menciones.tsx` (por `diferido()`), `use-menciones-en-redactor.ts` (Enter y Tab eligen sólo con opciones). El redactor
  (`features/mensajes/hooks/use-redactor.ts`) guarda `#Nombre` y arma el token al enviar; reintentar reusa id, cuerpo y menciones.
- Fichas de tarea y evento: `infra/fichas.client.ts` (por clase y tanda de 100), `features/fichas/` (`FichaDeTarea` completa por `completarTarea`).
  Crear: `infra/fichas-escritura.ts` (el `hint` es el campo), actions `crearTareaDelChat` y `crearEventoDelChat`; `/tarea` y `/evento` vacían el campo
  y abren `?panel=tarea|evento` (diferidos; cada apertura es un formulario nuevo). Invitados entre los miembros (`infra/miembros.client.ts`).
- `infra/consultas.ts` (la RPC de la lista y una conversación sólo si es mía) con sus pares `conversaciones*.ts` y `*.client.ts`;
  `infra/conversaciones-escritura.ts` (cinco RPC; el rechazo trae el campo en `hint`), `infra/personas.client.ts`, `infra/mensajes.client.ts` (la cita,
  en una segunda lectura por pk), `infra/mensajes-escritura.ts` (`mensaje_enviar|editar|eliminar`, `chat_leer`), `suscribirseAlHilo`.
- `infra/realtime.client.ts`: tres señales (`mensajes` sin filtro y mis filas de miembro para la lista; `mensajes` de la abierta para el hilo; sin
  `DELETE`); la fila es señal, se rehidrata por la RPC.
- `features/conversaciones/`, `features/mensajes/` (envío optimista con el mismo `id`). `?panel=nueva|grupo|salir|borrar-mensaje` (con
  `mensaje=<id>`) no toca `?c=`.
- Widget (`features/widget/`): `WidgetChat` fuera de `/chat`, montado por `HuecoChat` sólo con `chat.participar`. `no-leidos-store.ts` es el contador
  de la pestaña (sin Supabase: viaja en todas las pantallas); lo escribe `SuscripcionDeNoLeidos` (diferida; `chat_no_leidos` al descansar, tras cada
  señal de la lista con 250 ms, al reconectar y con cada `online`; un fallo deja el último valor). El panel se monta sólo abierto y elige la
  conversación por estado local (**no usa la URL**); sólo lee y responde: editar, borrar, `/tarea`, `/evento` y menciones llevan a `/chat`.
- `?c=<id>` ilegible = sin selección; sin fila propia = «ya no es mía» (nunca un 404).
- `?con=<usuario>`: la página lo resuelve **antes** de leer la lista con `abrirConversacionCon` (`chat_directa`, idempotente) y
  `redirigir('/chat?c=<id>')` fuera de todo `try`. Si la base lo niega («Esa persona no puede usar el chat.», «Elige a otra persona del equipo.») sale
  en un `<Aviso tono="peligro">` sobre la lista y `?con=` se queda. Uno ilegible se ignora.

## Tablas

`conversaciones` (`par_directo`, único parcial; `ultimo_mensaje_en`, que mueve `trg_chat_ultimo_mensaje` y nunca retrocede; sin índice propio: la
lista parte de las filas de miembro), `conversaciones_miembros` y `mensajes` (en `supabase_realtime`; hilo por
`mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)`; eliminado ⇒ cuerpo nulo, `mensajes_eliminado_sin_cuerpo`), `mensajes_menciones`.
Trigger `mensaje_editar_validar` (autor y `editado_en` al cambiar el cuerpo de un vivo). El canal global «Equipo» viene sembrado en la migración.

RPC (`security definer`): `chat_directa`, `chat_global_entrar`, `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`, `chat_leer`,
`chat_silenciar`, `mensaje_enviar`, `mensaje_editar`, `mensaje_eliminar`, `mensaje_tarea_crear`, `mensaje_evento_crear`; lecturas
`chat_conversaciones` (cursor `(ultimo_mensaje_en, id)`, 20 y hasta 50, con `no_leidos` y `otro`) y `chat_no_leidos`. Sin definer:
`_chat_puede_conversar`, `_chat_miembro_vigente`, `_chat_cuerpo`, `_chat_menciones_guardar`. Pruebas: `supabase/tests/areas/chat/`.

## No se rompe

- Toda la RLS gira sobre `conversaciones_miembros`; el dueño **no** ve conversaciones donde no es miembro (deliberado).
- Una mención no otorga acceso. Un lead purgado se lee como uno que no veo («No tienes acceso…»): distinguirlos filtraría existencia; «Eliminado»
  sólo si la fila trae `eliminado_en` o la FK de la ficha quedó nula.
- Directa = 2 miembros, una por par (`chat_directa` y el único de `par_directo`); no se deja.
- `es_miembro()` es la puerta: fila de miembro y, en el global, `chat.global` vigente. Toda función definer decide la membresía de quien llama con
  `es_miembro()`, nunca con la fila suelta (reabriría el global a quien perdió el permiso), salvo `chat_conversaciones` y `chat_no_leidos`, que
  repiten la regla entera (`lista.sql` L1 y L4). Si la regla cambia, cambia en los tres. La de un tercero, con `_chat_miembro_vigente`.
- Las cuatro tablas se escriben sólo por sus RPC (sin policies ni grants de escritura).
- Los tokens `#[<tipo>:<uuid>]` del cuerpo son el mismo conjunto que `p_menciones` (hasta 20). Mencionar o mandar en ficha exige ver lo mencionado.
  El aviso `mencion` va sin cuerpo a los miembros vigentes, aunque silenciaran.
- Realtime no aplica RLS a los DELETE de `conversaciones_miembros`: sólo INSERT y UPDATE con `usuario_id=eq.<yo>`.
- Editar: el autor, 15 minutos, versión `coalesce(editado_en, creado_en)`. Eliminar: el autor o `chat.moderar`, siempre miembro; vacía el cuerpo y
  borra las menciones; sin versión.
- Tarea o evento desde el chat: la regla de agenda y la del chat en una transacción; el id del mensaje es idempotente con un candado consultivo.

## Ojo

- Un evento con invitados es «para seleccionados» y exige `agenda.eventos.publicar`: sin él nace **privado y sin invitados** y los demás leen
  «Evento no disponible». La ficha de una tarea no se refresca por Realtime.
- `?mencion=` no es `?panel=`: va por `useQueryState` y no cambia la conversación. Editar muestra los tokens tal cual y manda las menciones que
  quedan. El redactor es un `<textarea>` plano: un `#Nombre` editado queda como texto sin mención.
- La señal de `mensajes` de la lista incluye lo propio; el hilo relee los 20 más nuevos y funde por `id`. «No enviado · Reintentar» reusa el `id` y
  la base responde `repetido`.
- Editar y borrar esperan a la base y los refleja la señal `UPDATE`; uno más viejo que los 20 más nuevos no se refresca en otra sesión.
  `mensajes → mensajes` no se embebe en PostgREST: la cita se lee aparte.
- `chat.global` para el canal global; `chat.participar` para cualquier chat.
- No leídos = mensajes de otros entre las 100 entradas más nuevas tras tu lectura («99+»). Enviar no mueve tu lectura: la pantalla llama `chat_leer`.
- `mensajes.tipo`: texto o ficha (tarea/evento/vehículo/lead/cotización) con la FK de su tipo (CHECK); las de vehículo, lead o cotización son
  `on delete set null` y las papeleras borran de verdad («ya no existe»).
- El `repetido` de `mensaje_enviar`, `mensaje_tarea_crear` y `mensaje_evento_crear` se responde antes de `es_miembro`: quien salió lo recibe por un
  mensaje suyo; sólo devuelve datos propios.
