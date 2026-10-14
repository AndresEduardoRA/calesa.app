'use client'

import { useState } from 'react'
import { consultarUso } from '../../../composicion.client'
import type { UsoDeApibara } from '../../../entities/uso-apibara'

type Estado =
  | { tipo: 'sin_pedir' }
  | { tipo: 'pidiendo' }
  | { tipo: 'visto'; uso: UsoDeApibara }
  | { tipo: 'fallo'; mensaje: string }

// El uso de la cuenta de apibara, sólo cuando la persona lo pide: nunca en automático.
export function useUsoDeApibara() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'sin_pedir' })
  return {
    estado,
    pedir: async () => {
      if (estado.tipo === 'pidiendo') {
        return
      }
      setEstado({ tipo: 'pidiendo' })
      const respuesta = await consultarUso()
      setEstado(
        respuesta.ok
          ? { tipo: 'visto', uso: respuesta.data }
          : { tipo: 'fallo', mensaje: respuesta.error.mensaje },
      )
    },
  }
}
