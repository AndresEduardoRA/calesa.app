'use client'

import { createContext, useContext } from 'react'

// De quién son los pagos que muestra el hueco (8.13-5, D6): de un vehículo (lo de siempre) o de un proyecto de repuestos. Lo da `PagosDelProyecto`; la lectura, el
// registro y el texto de confirmar lo leen. Sin proveedor es `vehiculo`: los llamadores del vehículo no cambian.
export type AmbitoDePago = 'vehiculo' | 'proyecto'

export const AmbitoDePagoContext = createContext<AmbitoDePago>('vehiculo')

export function useAmbitoDePago(): AmbitoDePago {
  return useContext(AmbitoDePagoContext)
}
