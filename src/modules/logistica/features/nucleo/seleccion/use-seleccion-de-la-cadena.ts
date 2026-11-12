'use client'

import { useContext } from 'react'
import { ContextoDeLaSeleccion, type SeleccionDeLaCadena } from './contexto'

/** La selección de la cadena, o `null` si quien mira no puede mover (no hay casillas ni barra). */
export function useSeleccionDeLaCadena(): SeleccionDeLaCadena | null {
  return useContext(ContextoDeLaSeleccion)
}
