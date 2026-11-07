'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { leerDefinicionParaEditar } from '../../../areas/formula/composicion.client'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'

export type LecturaDeLaDefinicion =
  | { tipo: 'leyendo' }
  | { tipo: 'error' }
  // No volvió la fila: se descartó, o quien mira ya no configura el origen (la policy esconde las dos igual).
  | { tipo: 'no_esta' }
  | { tipo: 'lista'; leida: FormulaParaEditar }

const SIN_LEER = 'No pudimos leer la fórmula.'

// La versión que abre el editor (4.21-3a-1): una lectura al montarse y otra con «Reintentar». Sólo la respuesta del último pedido cambia el estado: la de uno
// anterior, o la que llega con el editor ya cerrado, se descarta.
export function useLecturaDeLaDefinicion(formulaId: string) {
  const [estado, setEstado] = useState<LecturaDeLaDefinicion>({ tipo: 'leyendo' })
  const ultimo = useRef(0)

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerDefinicionParaEditar({ formulaId })
      .catch((): Resultado<FormulaParaEditar | null> => fallo('inesperado', SIN_LEER))
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        if (!resultado.ok) {
          setEstado({ tipo: 'error' })
        } else {
          setEstado(resultado.data ? { tipo: 'lista', leida: resultado.data } : { tipo: 'no_esta' })
        }
      })
      .catch(() => undefined)
  }, [formulaId])

  useEffect(() => {
    pedir()
    return () => {
      ultimo.current += 1
    }
  }, [pedir])

  return {
    estado,
    reintentar: () => {
      setEstado({ tipo: 'leyendo' })
      pedir()
    },
  }
}
