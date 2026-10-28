# notificaciones

Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por `notificar()`.

## Entra y sale

- Entra: `notificar()` desde RPC y triggers (tareas, turnos web, alertas de demora, recordatorios, menciones), suscripciones push del navegador.
- Sale: `<Campana>`, `usePush()`, `preferenciasDe(usuario)`. Lo consume `app/` (topbar) y `tablero`.
- Depende de: `equipo`.

## Archivos clave

- `entities/tipos.ts` — catálogo tipado de notificaciones (clave, título, ruta destino, requiere acción).
- `infra/realtime.client.ts`, `infra/push.ts` — `supabase/functions/push` recibe el webhook de la base y envía con `web-push`.
- `features/campana/`, `features/preferencias/`.

## Tablas

`notificaciones`, `suscripciones_push`. RPC/trigger: `notificar`, `tarea_notificar`, `recordatorios_notificar`, `alertas_demora`.

## No se rompe

- Sólo `notificar()` inserta: decide destinatarios por permiso (`usuario_tiene_permiso`) y respeta preferencias; nunca por nombre de rol.
- Anti-spam: una alerta de demora por unidad cada 72 h; recordatorios una sola vez.
- Realtime es señal: el cliente rehidrata con fetch; nunca confía en el payload para pintar.

## Ojo

- El webhook de push se autentica con `PUSH_WEBHOOK_SECRET` (header); la función usa el cliente admin **sólo** para leer suscripciones.
- `requiere_accion` muestra el botón en la campana (p. ej. «Contacté» de un turno web); al resolverse se marca leída por la acción, no por abrir la campana.
