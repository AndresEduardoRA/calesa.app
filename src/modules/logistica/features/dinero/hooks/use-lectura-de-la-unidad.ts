'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { useAlCambiarElDinero } from './eventos-de-dinero'

export type LecturaDeLaUnidad<Dato> =
  { tipo: 'cargando' } | { tipo: 'error'; error: ErrorApp } | { tipo: 'listo'; dato: Dato }

// Una lectura del navegador de lo que muestra un hueco de dinero (6.11-1): se lee al montarse el bloque y de nuevo cuando cambia el dinero de la unidad (lo avisa el hueco que
// guarda). Mientras vuelve a leer, lo que había se sigue viendo; «Reintentar» pasa por «cargando».
export function useLecturaDeLaUnidad<Dato>(
  unidadId: string,
  leer: (unidadId: string) => Promise<Resultado<Dato>>,
  mensajeDeFallo: string,
) {
  const [lectura, setLectura] = useState<LecturaDeLaUnidad<Dato>>({ tipo: 'cargando' })
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vigente = true
    void leer(unidadId)
      .catch(() => fallo('inesperado', mensajeDeFallo))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', dato: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [unidadId, leer, mensajeDeFallo, pedido])
  const releer = useCallback(() => {
    setPedido((n) => n + 1)
  }, [])
  useAlCambiarElDinero(unidadId, releer)
  return {
    lectura,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      releer()
    },
  }
}
