'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'
import { caido } from './ventana-de-revisiones'

// El turno de los pedidos de un panel: uno a la vez (`enVuelo`: dos toques seguidos no piden dos veces) y una respuesta de un pedido que ya no es el último (otra versión, el panel
// ya no está) se descarta. Un pedido nunca se adelanta a otro en vuelo.
export function useTurno(cotizacionId: string, version: string) {
  const ultimo = useRef(0)
  const enVuelo = useRef(false)

  useEffect(() => {
    ultimo.current += 1
    enVuelo.current = false
    return () => {
      ultimo.current += 1
      enVuelo.current = false
    }
  }, [cotizacionId, version])

  // Da `false` y no pide si ya hay uno en vuelo; si no, pide y, al llegar en el mismo turno, lo libera y llama `alLlegar`.
  const pedir = useCallback(
    (
      leer: () => Promise<Resultado<PaginaDeRevisiones>>,
      alLlegar: (r: Resultado<PaginaDeRevisiones>) => void,
    ) => {
      if (enVuelo.current) {
        return false
      }
      enVuelo.current = true
      ultimo.current += 1
      const pedido = ultimo.current
      leer()
        .catch(caido)
        .then((resultado) => {
          if (pedido === ultimo.current) {
            enVuelo.current = false
            alLlegar(resultado)
          }
        })
        .catch(() => undefined)
      return true
    },
    [],
  )
  return { pedir }
}
