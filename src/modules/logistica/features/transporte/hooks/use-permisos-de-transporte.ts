'use client'

import { useEffect, useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { leerMisPermisos } from '../../../areas/transporte/composicion.client'

// Los permisos de quien mira, para apagar el formulario del hueco (6.08-2). Mientras llegan, o si no se pudieron leer, es `null`: el formulario queda apagado (lo que protege es la base).
export function usePermisosDeTransporte(): Permisos | null {
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
