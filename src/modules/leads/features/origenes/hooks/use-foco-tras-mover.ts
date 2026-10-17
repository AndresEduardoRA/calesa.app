'use client'

import { useEffect } from 'react'
import type { Movimiento } from './use-origenes-de-lead'

// Tras mover, el foco sigue en el botón de esa fila (la fila cambia de lugar); si llegó al extremo y
// ese botón se apagó, pasa al otro. Los botones se encuentran por su `id` (`BotonesDeOrden`).
export function useFocoTrasMover(movimiento: Movimiento | null) {
  useEffect(() => {
    if (!movimiento) {
      return
    }
    const lado = movimiento.direccion
    const propio = document.getElementById(`origen-${movimiento.id}-${lado}`)
    const otro = document.getElementById(
      `origen-${movimiento.id}-${lado === 'subir' ? 'bajar' : 'subir'}`,
    )
    const destino = propio instanceof HTMLButtonElement && !propio.disabled ? propio : otro
    if (destino instanceof HTMLElement) {
      destino.focus()
    }
  }, [movimiento])
}
