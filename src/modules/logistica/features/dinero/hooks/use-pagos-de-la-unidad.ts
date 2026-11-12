'use client'

import {
  leerPagosDeLaUnidad,
  NO_SE_CARGARON_LOS_PAGOS,
} from '../../../areas/dinero/composicion.client'
import { useLecturaDeLaUnidad } from './use-lectura-de-la-unidad'

// Los pagos de una unidad (6.11-2): los más recientes, con el nombre de quien confirmó, el tope y si hay más. Ver `leerPagosDeLaUnidad`.
export function usePagosDeLaUnidad(unidadId: string) {
  return useLecturaDeLaUnidad(unidadId, leerPagosDeLaUnidad, NO_SE_CARGARON_LOS_PAGOS)
}
