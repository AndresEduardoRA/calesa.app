'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { leerTipoCambioDelNodo } from '../../../areas/formula/composicion.client'
import type { TipoCambioDelNodo } from '../../../entities/formula/tipo-cambio'

export type EstadoDelTipoCambioDelNodo =
  | { tipo: 'leyendo' }
  | { tipo: 'error' }
  | { tipo: 'sin_tipo' }
  | { tipo: 'listo'; tipoCambio: TipoCambioDelNodo }

function estadoDesde(resultado: Resultado<TipoCambioDelNodo | null>): EstadoDelTipoCambioDelNodo {
  if (!resultado.ok) {
    return { tipo: 'error' }
  }
  return resultado.data ? { tipo: 'listo', tipoCambio: resultado.data } : { tipo: 'sin_tipo' }
}

// El tipo de cambio que nombra el nodo del ⚙ en la versión que dibuja la hoja (4.20-3d, sobre la lectura del 4.20-3c): una lectura al montarse y otra con `releer`
// («Reintentar», «Volver a leer» tras un PT409). Sólo la respuesta del último pedido cambia el estado: la de uno anterior, o la que llega desmontado, se descarta.
export function useTipoCambioDelNodo({ formulaId, nodo }: { formulaId: string; nodo: string }) {
  const [estado, setEstado] = useState<EstadoDelTipoCambioDelNodo>({ tipo: 'leyendo' })
  const ultimo = useRef(0)

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerTipoCambioDelNodo({ formulaId, nodo })
      .catch((): Resultado<TipoCambioDelNodo | null> =>
        fallo('inesperado', 'No se pudo leer el tipo de cambio.'),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado(estadoDesde(resultado))
      })
      .catch(() => undefined)
  }, [formulaId, nodo])

  useEffect(() => {
    pedir()
    return () => {
      ultimo.current += 1
    }
  }, [pedir])

  return {
    estado,
    releer: () => {
      setEstado({ tipo: 'leyendo' })
      pedir()
    },
  }
}
