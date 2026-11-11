# notificaciones

Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por la puerta de la tabla.

## Entra y sale

- Entra: `notificar()` desde RPC y triggers (tareas, turnos web, alertas de demora, recordatorios, menciones; la cartera con `lead_compartir` y
  `lead_transferir`; la limpieza con `limpieza_avisar`), suscripciones push del navegador.
- Sale: `<Campana>` (`shell.client.ts`, el marco), `<ListaDeNotificaciones>` (`pantallas/notificaciones.ts`, `/notificaciones`),
  `leerPaginaDeNotificaciones()` y `filtroDeLista()` (`index.ts`), `usePush()` y `preferenciasDe(usuario)` (7.03/7.04). Lo consume `app/` (barra y página) y `tablero`.
- Depende de: `equipo`.

## Archivos clave

- `entities/tipos.ts` — catálogo por `tipo` (icono, si abrirlo acciona); `destino.ts` — una `ruta` sólo es enlace si es interna y su pantalla existe;
  `notificacion.ts` — la fila validada, el cursor `(creado_en, id)` y los topes; `fundir.ts` — fundir la primera página con lo cargado.
- `infra/consultas.ts` — las lecturas, escritas una vez para el servidor (`queries/`) y el navegador (`notificaciones.client.ts`); `infra/notificaciones.ts`
  — abrir y marcar (RLS + grants de columna). El canal de Realtime es `shared/lib/supabase/canal.client.ts`.
- `features/campana/` (botón, contador y popover, el contenido y Realtime diferidos) y `features/lista/` (la página: `CuerpoDeLaLista`,
  «Ver más», «Marcar todas», **la fila `FilaDeNotificacion` que usan la campana y la página**, `actions/`). `features/preferencias/` llega con 7.04.
- **La acción propia de un tipo** («Contacté» de un turno web) la dibuja `app/`: el registro `ACCIONES_DE_NOTIFICACIONES` de
  `src/app/(app)/_shell/huecos/acciones-de-notificaciones.ts` llega por props (una función no cruza de servidor a cliente). La Fase 8 suma su entrada.
  `infra/push.ts` y `supabase/functions/push` llegan con 7.03.

## Tablas

`notificaciones`, `suscripciones_push`, `limpieza_avisos` (la marca de «ya avisado» de la limpieza, sólo `service_role`); purga `visitados`. RPC/trigger:
`notificar`, `notificaciones_puerta`, `tarea_notificar`, `recordatorios_notificar`, `notificaciones_purgar`, `limpieza_avisar`, `alertas_demora`.

## No se rompe

- **Toda fila pasa por la puerta** (`trg_notificaciones_puerta`, `before insert`, 7.01): a quien está de baja, bloqueado o sin perfil no le llega nada, sin
  error para quien avisa. Cubre a `notificar()` y a los inserts directos de otras fases (`alertas_demora`, turnos web). La app no inserta (`authenticated` sin
  `insert` ni `execute` de `notificar()`): avisa la base. Quien avisa elige a quién (por permiso o por relación, nunca por nombre de rol).
- Las preferencias no apagan la campana: la campana es el registro; las preferencias gobiernan sólo el push (7.03).
- Anti-spam: una alerta de demora por unidad cada 72 h; recordatorios una sola vez por hora fijada (cambiar la hora reemplaza el aviso abierto).
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

- El push (7.03, todavía no está): el plan es que el webhook se autentique con `PUSH_WEBHOOK_SECRET` (header) y la función use el cliente admin **sólo**
  para leer suscripciones.
- `requiere_accion` muestra el botón en la campana (p. ej. «Contacté» de un turno web); al resolverse se marca leída por la acción, no por abrir la campana.
- La campana pide su contador y su canal cuando el navegador descansa (`useAlDescansar`), no al hidratar: el cliente de Supabase evaluado durante la hidratación retrasa ≈ 320 ms el primer clic que vale en toda pantalla. Sus pedidos a `notificaciones` no cuentan en un spec que mide pedidos a la base (`esDelMarco` de `e2e/soporte/pedidos-del-marco.ts`), y su parada de Tab sí cuenta en las tareas de oro.
- `suscribirseACambios` avisa (`alReconectar`) en **cada** unión del canal, la primera incluida: lo anterior a la unión no llegó como señal.
