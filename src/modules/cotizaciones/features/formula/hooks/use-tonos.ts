'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import {
  leerTonosDelCatalogo,
  type TonoDelCatalogo,
} from '../../../areas/formula/composicion.client'

export type EstadoDeLosTonos =
  | { tipo: 'leyendo' }
  | { tipo: 'error' }
  | { tipo: 'listo'; tonos: readonly TonoDelCatalogo[]; claves: ReadonlySet<string> }

// El catálogo de tonos de la sección «Grupos» del editor (4.21-3c, C3): una lectura al montarse y otra con «Reintentar». Sólo la respuesta del último pedido cambia el
// estado: la de uno anterior, o la que llega con la sección ya desmontada, se descarta.
export function useTonos() {
  const [estado, setEstado] = useState<EstadoDeLosTonos>({ tipo: 'leyendo' })
  const ultimo = useRef(0)

  const pedir = useCallback(() => {
    ultimo.current += 1
    const pedido = ultimo.current
    leerTonosDelCatalogo()
      .catch((): Resultado<TonoDelCatalogo[]> => fallo('inesperado', 'Sin tonos.'))
      .then((r) => {
        if (pedido !== ultimo.current) return
        setEstado(
          r.ok
            ? { tipo: 'listo', tonos: r.data, claves: new Set(r.data.map((t) => t.clave)) }
            : { tipo: 'error' },
        )
      })
      .catch(() => undefined)
  }, [])

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
