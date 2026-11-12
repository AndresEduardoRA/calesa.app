'use client'

import { leerMargen, NO_SE_CARGO_EL_MARGEN } from '../../../areas/dinero/composicion.client'
import { useLecturaDeLaUnidad } from './use-lectura-de-la-unidad'

// El margen de una unidad (6.11-1). Vuelve a leer cuando el hueco «Gastos» guarda o elimina.
export function useMargen(unidadId: string) {
  return useLecturaDeLaUnidad(unidadId, leerMargen, NO_SE_CARGO_EL_MARGEN)
}
