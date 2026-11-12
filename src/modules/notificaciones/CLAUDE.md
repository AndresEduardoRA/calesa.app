# notificaciones

Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por la puerta de la tabla.

## Entra y sale

- Entra: `notificar()` desde RPC y triggers (tareas, turnos web, alertas de demora, recordatorios, menciones; la cartera con `lead_compartir` y
  `lead_transferir`; la limpieza con `limpieza_avisar`), suscripciones push del navegador.
- Sale: `<Campana>` (`shell.client.ts`, el marco), `<ListaDeNotificaciones>` (`pantallas/notificaciones.ts`, `/notificaciones`),
  `leerPaginaDeNotificaciones()` y `filtroDeLista()` (`index.ts`), `<NotificacionesDelPerfil>` (`pantallas/perfil.ts`, el bloque de `/perfil`). Lo consume `app/` (barra y página) y `tablero`.
- Depende de: `equipo`.

## Archivos clave

- `entities/tipos.ts` — catálogo por `tipo` (icono, si abrirlo acciona, `etiqueta` y `descripcion` de las preferencias); `estado-del-push.ts` — la prioridad de los motivos de un interruptor deshabilitado; `preferencia-de-push.ts` — sólo se guarda lo apagado; `destino.ts` — una `ruta` sólo es enlace si es interna y su pantalla existe;
  `notificacion.ts` — la fila validada, el cursor `(creado_en, id)` y los topes; `fundir.ts` — fundir la primera página con lo cargado.
- `infra/consultas.ts` — las lecturas, escritas una vez para el servidor (`queries/`) y el navegador (`notificaciones.client.ts`); `infra/notificaciones.ts`
  — abrir y marcar (RLS + grants de columna). El canal de Realtime es `shared/lib/supabase/canal.client.ts`.
- `features/campana/` (botón, contador y popover, el contenido y Realtime diferidos) y `features/lista/` (la página: `CuerpoDeLaLista`,
  «Ver más», «Marcar todas», **la fila `FilaDeNotificacion` que usan la campana y la página**, `actions/`). `features/push/` (`usePush()`, este navegador y «Tus navegadores», las acciones `suscribirPush` y `quitarSuscripcion`) y `features/preferencias/` (un interruptor de push por tipo del catálogo, `guardarPreferenciaDePush`; el bloque servidor `NotificacionesDelPerfil`). `infra/push.client.ts` es lo del navegador (soporte, permiso, service worker, suscripción) y no importa nada del servidor. `public/sw.js` atiende `push` y `notificationclick`.
- **La acción propia de un tipo** («Contacté» de un turno web) la dibuja `app/`: el registro `ACCIONES_DE_NOTIFICACIONES` de
  `src/app/(app)/_shell/huecos/acciones-de-notificaciones.ts` llega por props (una función no cruza de servidor a cliente). La Fase 8 suma su entrada.
- `supabase/functions/push` (7.03-2) canjea el pase de `push_disparar` y envía (RFC 8291/8292 con Web Crypto).

## Tablas

`notificaciones`, `suscripciones_push`, `push_pases` (el pase de un uso del push, sólo `service_role`), `limpieza_avisos` (la marca de «ya avisado» de la
limpieza, sólo `service_role`); purga `visitados`. RPC/trigger: `notificar`, `notificaciones_puerta`, `tarea_notificar`, `recordatorios_notificar`,
`notificaciones_purgar`, `limpieza_avisar`, `alertas_demora`, `documentos_vencimientos` (6.12: `documento_por_vencer`, una vez por persona y
documento desde su ventana de aviso; en el catálogo con `FileClock`, «Vencimientos» y acciona al abrir, 6.12-2); push (7.03): `push_suscribir`, `push_desuscribir`, `push_abrir` y `push_resultado` (sólo
`service_role`) y `trg_notificaciones_push` → `push_disparar`.

## No se rompe

- **Toda fila pasa por la puerta** (`trg_notificaciones_puerta`, `before insert`, 7.01): a quien está de baja, bloqueado o sin perfil no le llega nada, sin
  error para quien avisa. Cubre a `notificar()` y a los inserts directos de otras fases (turnos web; `alertas_demora` usa `notificar()` desde 6.12). La app no inserta (`authenticated` sin
  `insert` ni `execute` de `notificar()`): avisa la base. Quien avisa elige a quién (por permiso o por relación, nunca por nombre de rol).
- Las preferencias no apagan la campana: la campana es el registro; las preferencias gobiernan sólo el push (7.03).
- Anti-spam: una alerta de demora abierta por persona y unidad; se reabre la misma pasado `fases.alerta_cada_horas` (nulo = 72 h) y mover la cierra
  (`trg_alertas_cerrar_al_mover`, 6.12); recordatorios una sola vez por hora fijada (cambiar la hora reemplaza el aviso abierto).
- Jobs (7.01): `recordatorios-notificar` cada minuto (`recordatorios_notificar()`, 200 por corrida) y `notificaciones-purgar` a las 03:45 UTC
  (`notificaciones_purgar()`: leídas o accionadas de más de 90 días y `visitados` de más de 30, por lotes). Una no leída y no accionada nunca se purga.
  `actividad_purgar()` no se programa (Fase 9).
- **Avisos de cartera** (7.01-2): `lead_compartido` a quien recibe y `lead_transferido` al destino, sin acción, sólo si algo cambió (`sin_cambios` no
  avisa); repetir reemplaza el aviso abierto. **Ningún `titulo` ni `cuerpo` lleva el teléfono, el número ni el nombre de un lead** (viajan por Realtime y
  quedan después de perder el acceso): el lead se abre por la `ruta`.
- **Aviso de limpieza** (7.01-2): job `limpieza-avisar` a las 13:15 UTC (`limpieza_avisar()`, 200 avisos por corrida): `limpieza_pronto`, con acción, al
  creador del importado que entra en la ventana de «Se limpiará pronto» (`_limpieza_ventana_de_aviso()` = `VENTANA_DE_AVISO_DIAS`). **Una vez por vehículo**:
  manda la marca de `limpieza_avisos`, no la notificación (que se puede borrar o purgar). Con el interruptor general apagado no avisa ni marca.
- Realtime es señal: el cliente rehidrata con fetch; nunca confía en el payload para pintar. `notificaciones` está en `supabase_realtime` (7.01):
  `postgres_changes` la reparte bajo la policy de lectura. **Los `DELETE` no pasan por RLS en Realtime** (llegan a todo suscriptor con la PK): el
  cliente se suscribe sólo a `INSERT` y `UPDATE` con `usuario_id=eq.<yo>` y nunca reacciona a `DELETE` (la purga diaria y los recordatorios borran).

## Ojo

- **Push web** (7.03-1, la base): `suscripciones_push` se escribe sólo por `push_suscribir` (exige `notificaciones.push`; endpoint `https` de un servicio
  de push, `_push_endpoint_valido()`, para que la función no sea un proxy abierto; un endpoint que existe pasa a quien suscribe; tope de 10, se va la menos
  reciente) y `push_desuscribir` (sin el permiso). Cada notificación que entra dispara (`after insert`) si `push_web` está activa, el destinatario tiene
  el permiso, no apagó el tipo en la preferencia `notificaciones.push` (`{ "<tipo>": false }`; sin fila, todo encendido), tiene suscripción y hay
  `url_proyecto`: crea un **pase** (`push_pases`, un uso, 10 min) y llama a `/functions/v1/push` por `pg_net`. Sin secretos en la base y sin cola de
  reintentos (la campana es el registro). **El push nunca rompe la operación que avisa** (bloque de excepción; sólo el `sqlstate` al log). `push_abrir`
  devuelve título, cuerpo, `ruta` y las suscripciones válidas del destinatario, nada más; `push_resultado` anota una vez por pase (404/410 borran).
  La función `push` (7.03-2) canjea antes de mirar las claves (sin ellas, `sin_claves`), vuelve a validar el host, no sigue redirecciones y sólo
  da por caducada una suscripción con 404/410 (un 403 o un 5xx es `fallo`). Contrato: `supabase/tests/push-contrato.test.ts` y `push-funcion.test.ts`.
- `requiere_accion` muestra el botón en la campana (p. ej. «Contacté» de un turno web); al resolverse se marca leída por la acción, no por abrir la campana.
- La campana pide su contador y su canal cuando el navegador descansa (`useAlDescansar`), no al hidratar: el cliente de Supabase evaluado durante la hidratación retrasa ≈ 320 ms el primer clic que vale en toda pantalla. Sus pedidos a `notificaciones` no cuentan en un spec que mide pedidos a la base (`esDelMarco` de `e2e/soporte/pedidos-del-marco.ts`), y su parada de Tab sí cuenta en las tareas de oro.
- `suscribirseACambios` avisa (`alReconectar`) en **cada** unión del canal, la primera incluida: lo anterior a la unión no llegó como señal.
- **El push del perfil** (7.04): `usePush()` lee el navegador con `getRegistration()` (nunca `ready`, que se cuelga sin registro) y registra `/sw.js` él mismo al encender: el layout sólo lo registra en producción, así que en dev y en e2e no hay service worker hasta que alguien enciende. La clave pública VAPID se lee en el servidor (`NotificacionesSeccion` de `app/`) y llega por props. Si la base rechaza la suscripción, el hook da de baja la del navegador (no deja una huérfana). La preferencia se escribe directo bajo RLS propia (`guardarPreferenciaDePush` lee la fila, cambia una clave y borra la fila si queda vacía; dos pestañas a la vez pueden pisarse una clave). `notificationclick` sólo abre rutas del mismo origen que empiezan con una sola `/`; si no, `/notificaciones` (`sw.test.ts` lo prueba con `node:vm`).
