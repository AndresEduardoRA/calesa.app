'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { leerValorPorDefecto } from '../../../areas/formula/composicion.client'
import {
  MENSAJE_SIN_LA_CONSTANTE,
  MENSAJE_SIN_LEER_EL_VALOR,
  type ValorPorDefecto,
} from '../../../entities/formula/ajuste'

export type EstadoDelValorPorDefecto =
  | { tipo: 'leyendo' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_constante'; mensaje: string }
  | ({ tipo: 'listo' } & ValorPorDefecto)

function estadoDesde(resultado: Resultado<ValorPorDefecto | null>): EstadoDelValorPorDefecto {
  if (!resultado.ok) {
    return { tipo: 'error', mensaje: MENSAJE_SIN_LEER_EL_VALOR }
  }
  const leido = resultado.data
  // Sin publicada, o sin ninguno de los nodos: no hay qué cambiar. Con dos nodos y uno solo, el panel dice cuál falta.
  if (!leido || Object.values(leido.valores).every((valor) => valor === null)) {
    return { tipo: 'sin_constante', mensaje: MENSAJE_SIN_LA_CONSTANTE }
  }
  return { tipo: 'listo', ...leido }
}

// El valor por defecto de las constantes de un ⚙ (4.20-3a; lo monta el panel del 4.20-3b al abrirse): una lectura al montarse y otra con `releer` («Reintentar», «Volver
// a leer» tras un PT409). Sólo la respuesta del último pedido cambia el estado: la de uno anterior, o la que llega con el componente ya desmontado, se descarta.
export function useValorPorDefecto({
  origenId,
  nodos,
}: {
  origenId: string
  nodos: readonly string[]
}) {
  const [estado, setEstado] = useState<EstadoDelValorPorDefecto>({ tipo: 'leyendo' })
  const ultimo = useRef(0)
  const clave = nodos.join(',')
  const pedidos = useMemo(() => clave.split(','), [clave])

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerValorPorDefecto({ origenId, nodos: pedidos })
      .catch((): Resultado<ValorPorDefecto | null> =>
        fallo('inesperado', MENSAJE_SIN_LEER_EL_VALOR),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado(estadoDesde(resultado))
      })
      .catch(() => undefined)
  }, [origenId, pedidos])

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
