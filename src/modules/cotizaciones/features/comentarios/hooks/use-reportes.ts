'use client'

import { useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import {
  leerReportes,
  NO_SE_CARGARON_LOS_REPORTES,
} from '../../../areas/comentarios/composicion.client'
import type { ReporteDeLaCotizacion } from '../../../entities/comentarios/moderacion-lectura'

type Estado =
  | { cargando: true; pedido: number }
  | { cargando: false; pedido: number; reportes: ReporteDeLaCotizacion[]; hayMas: boolean }
  | { cargando: false; pedido: number; error: ErrorApp }

const caido = (): Resultado<never> => fallo('inesperado', NO_SE_CARGARON_LOS_REPORTES)

// Los reportes de una cotización, leídos una vez al montarse (el Confirmar de moderar monta la lista en cada apertura, 4.27-4). «Reintentar» vuelve a leer.
export function useReportes(cotizacionId: string) {
  const [estado, setEstado] = useState<Estado>({ cargando: true, pedido: 0 })
  const { cargando, pedido } = estado
  useEffect(() => {
    if (!cargando) {
      return
    }
    let vigente = true
    leerReportes(cotizacionId)
      .catch(caido)
      .then((resultado) => {
        if (vigente) {
          setEstado(
            resultado.ok
              ? { cargando: false, pedido, ...resultado.data }
              : { cargando: false, pedido, error: resultado.error },
          )
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [cargando, pedido, cotizacionId])
  return {
    estado,
    reintentar: () => {
      setEstado((antes) => ({ cargando: true, pedido: antes.pedido + 1 }))
    },
  }
}
