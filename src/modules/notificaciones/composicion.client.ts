// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export {
  contarNotificacionesNoLeidas,
  leerNotificacionesParaLaCampana,
  leerPaginaDeNotificaciones,
} from './infra/notificaciones.client'
export {
  desuscribirEnElNavegador,
  leerElNavegador,
  soportaPush,
  suscribirEnElNavegador,
} from './infra/push.client'
export type { EstadoDelNavegador } from './infra/push.client'
