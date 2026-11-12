'use client'

import { useEffect, useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { leerMisPermisos } from '../../../areas/dinero/composicion.client'

// Los permisos de quien mira, para decidir los botones del hueco (6.11-1). Mientras llegan, o si no se pudieron leer, es `null`: ningún botón de escribir (lo que protege es la base).
export function usePermisosDeDinero(): Permisos | null {
  const [permisos, setPermisos] = useState<Permisos | null>(null)
  useEffect(() => {
    let vigente = true
    leerMisPermisos()
      .then((resultado) => {
        if (vigente && resultado.ok) {
          setPermisos(resultado.data)
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [])
  return permisos
}
