import { NAVEGACION } from './navegacion'

// Los caminos con pantalla (la navegación disponible y `/notificaciones`, que no está en la barra): un aviso cuya ruta
// cae fuera de ellos no se enlaza, para no llevar a un 404. Lo usan la campana del marco y `/notificaciones`.
export const RUTAS_CON_PANTALLA: string[] = [
  ...NAVEGACION.filter((entrada) => entrada.disponible).map((entrada) => entrada.ruta),
  '/notificaciones',
]
