'use client'

import { useState } from 'react'

// Un panel o un diálogo que se carga diferido (`next/dynamic`) se monta recién la primera vez que se
// abre, y desde ahí queda montado: así se va de la pantalla con su animación al cerrarse y no vuelve a
// pedir su código.
export function useAbiertoAlgunaVez(abierto: boolean): boolean {
  const [visto, setVisto] = useState(abierto)
  if (abierto && !visto) {
    setVisto(true)
  }
  return abierto || visto
}
