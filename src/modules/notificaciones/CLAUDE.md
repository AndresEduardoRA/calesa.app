# notificaciones

Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por la puerta de la tabla.

Abierto: **7-5** (pedida sin red, la suscripción de fondo pone su barra «Sin conexión»; `docs/PENDIENTES.md`).

## Entra y sale

- Entra: `notificar()` desde RPC y triggers de otros módulos; suscripciones push del navegador.
- Sale: `<Campana>` (`shell.client.ts`), `pantallas/notificaciones.ts`, `pantallas/perfil.ts` (`<NotificacionesDelPerfil>`),
  `leerPaginaDeNotificaciones()` y `filtroDeLista()`. Depende de `equipo`.

## Archivos clave

- `entities/tipos.ts` — catálogo por `tipo` (icono, si abrirlo acciona, textos de la preferencia). `entities/destino.ts`: una `ruta` es enlace sólo si
  es interna y su pantalla existe.
- **La acción propia de un tipo** («Contacté») la dibuja `app/`: `ACCIONES_DE_NOTIFICACIONES` en
  `src/app/(app)/_shell/huecos/acciones-de-notificaciones.ts`, por props (una función no cruza de servidor a cliente).
- `infra/push.client.ts` no importa nada del servidor; `public/sw.js` atiende `push` y `notificationclick`; `supabase/functions/push` canjea el pase y
  envía (RFC 8291/8292 con Web Crypto).

## Tablas

`notificaciones`, `suscripciones_push`, `push_pases` y `limpieza_avisos` (estas dos, sólo `service_role`); purga `visitados`. RPC/trigger: `notificar`,
`notificaciones_puerta`, `tarea_notificar`, `recordatorios_notificar`, `notificaciones_purgar`, `limpieza_avisar`, `alertas_demora`,
`documentos_vencimientos` (una vez por persona y documento), `push_suscribir`, `push_desuscribir`, `push_abrir` y `push_resultado` (sólo
`service_role`), `trg_notificaciones_push` → `push_disparar`.

## No se rompe

- **Toda fila pasa por la puerta** (`trg_notificaciones_puerta`, `before insert`): a quien está de baja, bloqueado o sin perfil no le llega nada, sin
  error para quien avisa. La app no inserta ni ejecuta `notificar()`. Quien avisa elige a quién por permiso o relación, nunca por nombre de rol.
- Las preferencias no apagan la campana (es el registro): gobiernan sólo el push.
- Anti-spam: una alerta de demora abierta por persona y unidad; se reabre pasado `fases.alerta_cada_horas` (nulo = 72 h) y mover la cierra; un
  recordatorio avisa una vez por hora fijada.
- Jobs: `recordatorios-notificar` cada minuto (200 por corrida); `notificaciones-purgar` 03:45 UTC (leídas o accionadas de más de 90 días, `visitados`
  de más de 30). Una no leída y no accionada nunca se purga.
- Avisos de cartera (`lead_compartido`, `lead_transferido`) sólo si algo cambió; repetir reemplaza el abierto. **Ningún `titulo` ni `cuerpo` lleva el
  teléfono, el número ni el nombre de un lead** (viajan por Realtime y quedan tras perder el acceso): se abre por la `ruta`.
- Aviso de limpieza (`limpieza-avisar`, 13:15 UTC, 200 por corrida): `limpieza_pronto` al creador del importado que entra en la ventana
  (`VENTANA_DE_AVISO_DIAS`). **Una vez por vehículo**: manda la marca de `limpieza_avisos`, no la notificación. Con el interruptor general apagado no
  avisa ni marca.
- Realtime es señal: el cliente rehidrata con fetch. **Los `DELETE` no pasan por RLS en Realtime**: suscribirse sólo a `INSERT` y `UPDATE` con
  `usuario_id=eq.<yo>`.

## Ojo

- **Push**: `push_suscribir` exige `notificaciones.push` y un endpoint `https` de un servicio de push (`_push_endpoint_valido()`, para no ser un proxy
  abierto); tope 10 por persona. Dispara si `push_web` está activa, hay permiso, suscripción y `url_proyecto`, y el tipo no está apagado
  (`notificaciones.push` = `{ "<tipo>": false }`): crea un pase de un uso (10 min) y llama a la función por `pg_net`. Sin secretos en la base ni
  reintentos. **El push nunca rompe la operación que avisa.** La función canjea antes de mirar las claves, revalida el host, no sigue redirecciones y
  sólo con 404/410 borra la suscripción. Contrato: `supabase/tests/push-contrato.test.ts`, `push-funcion.test.ts`, `push-de-verdad.sh`.
- `requiere_accion`: se marca leída al resolver la acción, no al abrir la campana.
- La campana pide contador y canal al descansar el navegador (`useAlDescansar`), no al hidratar; sus pedidos no cuentan en un spec que mide pedidos
  (`esDelMarco` de `e2e/soporte/pedidos-del-marco.ts`).
- `suscribirseACambios` avisa (`alReconectar`) en **cada** unión del canal, la primera incluida.
- `usePush()` usa `getRegistration()` (nunca `ready`, que se cuelga sin registro) y registra `/sw.js` al encender (el layout sólo lo registra en
  producción). Si la base rechaza la suscripción, da de baja la del navegador. Dos pestañas pueden pisarse una clave de la preferencia.
  `notificationclick` sólo abre rutas del mismo origen con una sola `/` inicial; si no, `/notificaciones` (`sw.test.ts`).
