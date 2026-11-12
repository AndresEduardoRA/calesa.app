'use client'

import { createContext } from 'react'
import type {
  EstadoDeLaSeleccion,
  FaseElegida,
  UnidadElegida,
} from '../../../entities/nucleo/seleccion'

// Lo que la cadena sabe de la selección para mover en lote (6.04-3). La cadena no sabe mover: sólo lee este contexto, que da el área `mover` por el núcleo, así ningún área importa a otra
// (D27). Sin proveedor (quien no puede mover) el contexto es `null` y la cadena se ve igual que antes.
export type SeleccionDeLaCadena = {
  estado: EstadoDeLaSeleccion
  alternar: (fase: FaseElegida, unidad: UnidadElegida) => void
  elegirLaColumna: (fase: FaseElegida, unidades: readonly UnidadElegida[]) => void
  vaciar: () => void
}

export const ContextoDeLaSeleccion = createContext<SeleccionDeLaCadena | null>(null)
