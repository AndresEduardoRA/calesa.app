'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import {
  leerTransporteDeLaUnidad,
  NO_SE_CARGO_EL_TRANSPORTE,
  type TransporteDeLaUnidad,
} from '../../../areas/transporte/composicion.client'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

export type LecturaDelTransporte =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; datos: TransporteDeLaUnidad }

// El transporte de una unidad (6.08-2): se lee al montarse el bloque y de nuevo cuando otro hueco avisa que cambió algo de la unidad o tras guardar (`releer`). Mientras vuelve a leer, lo que
// había se sigue viendo; «Reintentar» pasa por «cargando».
export function useTransporteDeLaUnidad(
  unidad: Pick<Unidad, 'tipo' | 'id'> & { origenId: string },
) {
  const [lectura, setLectura] = useState<LecturaDelTransporte>({ tipo: 'cargando' })
  const [pedido, setPedido] = useState(0)
  const { tipo, id, origenId } = unidad
  useEffect(() => {
    let vigente = true
    void leerTransporteDeLaUnidad({ tipo, id, origenId })
      .catch(() => fallo('inesperado', NO_SE_CARGO_EL_TRANSPORTE))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', datos: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [tipo, id, origenId, pedido])
  const releer = useCallback(() => {
    setPedido((n) => n + 1)
  }, [])
  useAlCambiarLaUnidad(id, releer)
  return {
    lectura,
    releer,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      releer()
    },
  }
}
