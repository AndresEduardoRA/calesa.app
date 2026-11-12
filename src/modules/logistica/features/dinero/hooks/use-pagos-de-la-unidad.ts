'use client'

import {
  leerPagosDelProyecto,
  leerPagosDeLaUnidad,
  NO_SE_CARGARON_LOS_PAGOS,
} from '../../../areas/dinero/composicion.client'
import { useAmbitoDePago } from './ambito-de-pago'
import { useLecturaDeLaUnidad } from './use-lectura-de-la-unidad'

// Los pagos de una unidad (6.11-2) o de un proyecto de repuestos (8.13-5, por el ámbito): los más recientes, con el nombre de quien confirmó, el tope y si hay más.
export function usePagosDeLaUnidad(unidadId: string) {
  const leer = useAmbitoDePago() === 'proyecto' ? leerPagosDelProyecto : leerPagosDeLaUnidad
  return useLecturaDeLaUnidad(unidadId, leer, NO_SE_CARGARON_LOS_PAGOS)
}
