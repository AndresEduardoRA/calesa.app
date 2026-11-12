'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import {
  leerAduanaDeLaUnidad,
  NO_SE_CARGO_LA_ADUANA,
  type AduanaDeLaUnidad,
} from '../../../areas/aduana/composicion.client'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

export type LecturaDeLaAduana =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  // `aduana` nula: la unidad no está en ninguna declaración.
  | { tipo: 'listo'; aduana: AduanaDeLaUnidad | null }

// La declaración vigente de una unidad (6.09-1): se lee al montarse el bloque y de nuevo cuando otro hueco avisa que cambió algo de la unidad (un gasto de tributos, por ejemplo). Mientras
// vuelve a leer, lo que había se sigue viendo; «Reintentar» pasa por «cargando».
export function useAduanaDeLaUnidad(unidadId: string) {
  const [lectura, setLectura] = useState<LecturaDeLaAduana>({ tipo: 'cargando' })
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vigente = true
    void leerAduanaDeLaUnidad(unidadId)
      .catch(() => fallo('inesperado', NO_SE_CARGO_LA_ADUANA))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', aduana: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [unidadId, pedido])
  const releer = useCallback(() => {
    setPedido((n) => n + 1)
  }, [])
  useAlCambiarLaUnidad(unidadId, releer)
  return {
    lectura,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      releer()
    },
  }
}
