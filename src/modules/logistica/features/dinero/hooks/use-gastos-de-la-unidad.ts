'use client'

import {
  leerGastosDeLaUnidad,
  NO_SE_CARGARON_LOS_GASTOS,
} from '../../../areas/dinero/composicion.client'
import { useLecturaDeLaUnidad } from './use-lectura-de-la-unidad'

// Los gastos de una unidad (6.11-1): los más recientes, con el tope y si hay más. Ver `leerGastosDeLaUnidad`.
export function useGastosDeLaUnidad(unidadId: string) {
  return useLecturaDeLaUnidad(unidadId, leerGastosDeLaUnidad, NO_SE_CARGARON_LOS_GASTOS)
}
