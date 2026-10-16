'use client'

import { useState } from 'react'

// Cuántas veces se abrió: como `key` de lo que vive dentro de un modal, cada apertura empieza de cero
// (un id de intento nuevo, los campos vacíos) y el cierre no lo remonta, así se va con su animación y
// con lo último que mostró.
export function useApertura(abierto: boolean): number {
  const [estado, setEstado] = useState({ abierto, veces: abierto ? 1 : 0 })
  if (abierto !== estado.abierto) {
    setEstado({ abierto, veces: abierto ? estado.veces + 1 : estado.veces })
  }
  return abierto && !estado.abierto ? estado.veces + 1 : estado.veces
}
