# notificaciones

Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por la puerta de la tabla.

## Entra y sale

- Entra: `notificar()` desde RPC y triggers (tareas, turnos web, alertas de demora, recordatorios, menciones), suscripciones push del navegador.
- Sale: `<Campana>`, `usePush()`, `preferenciasDe(usuario)`. Lo consume `app/` (topbar) y `tablero`.
- Depende de: `equipo`.

## Archivos clave

- `entities/tipos.ts` — catálogo tipado de notificaciones (clave, título, ruta destino, requiere acción).
- `infra/realtime.client.ts`, `infra/push.ts` — `supabase/functions/push` recibe el webhook de la base y envía con `web-push`.
- `features/campana/`, `features/preferencias/`.

## Tablas

`notificaciones`, `suscripciones_push`. RPC/trigger: `notificar`, `notificaciones_puerta`, `tarea_notificar`, `recordatorios_notificar`, `alertas_demora`.

## No se rompe

- **Toda fila pasa por la puerta** (`trg_notificaciones_puerta`, `before insert`, 7.01): a quien está de baja, bloqueado o sin perfil no le llega nada, sin
  error para quien avisa. Cubre a `notificar()` y a los inserts directos de otras fases (`alertas_demora`, turnos web). La app no inserta (`authenticated` sin
  `insert` ni `execute` de `notificar()`): avisa la base. Quien avisa elige a quién (por permiso o por relación, nunca por nombre de rol).
- Las preferencias no apagan la campana: la campana es el registro; las preferencias gobiernan sólo el push (7.03).
- Anti-spam: una alerta de demora por unidad cada 72 h; recordatorios una sola vez.
- Realtime es señal: el cliente rehidrata con fetch; nunca confía en el payload para pintar.

## Ojo

- El webhook de push se autentica con `PUSH_WEBHOOK_SECRET` (header); la función usa el cliente admin **sólo** para leer suscripciones.
- `requiere_accion` muestra el botón en la campana (p. ej. «Contacté» de un turno web); al resolverse se marca leída por la acción, no por abrir la campana.
