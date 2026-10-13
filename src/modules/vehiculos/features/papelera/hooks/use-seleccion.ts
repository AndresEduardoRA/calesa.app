'use client'

import { useState } from 'react'
import { SIN_SELECCION, alternar, alternarTodas, vigente, type Seleccion } from '../seleccion'

// Las filas elegidas del listado. Vive en la pantalla, no en la URL: es efímera, y al cambiar de
// página o de filtro lo que ya no se ve deja de estar elegido.
export function useSeleccion(seleccionables: readonly string[]) {
  const [guardada, setGuardada] = useState<Seleccion>(SIN_SELECCION)
  const elegidas = vigente(guardada, seleccionables)
  return {
    elegidas,
    alternar: (id: string) => {
      setGuardada(alternar(elegidas, id))
    },
    alternarTodas: () => {
      setGuardada(alternarTodas(elegidas, seleccionables))
    },
    limpiar: () => {
      setGuardada(SIN_SELECCION)
    },
  }
}
