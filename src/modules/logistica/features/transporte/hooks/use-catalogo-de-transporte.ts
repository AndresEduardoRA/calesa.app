'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { CatalogoLeido } from '../../../areas/transporte/composicion.client'

export type LecturaDeCatalogo<T> =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; filas: T[]; hayMas: boolean }

// Lo propio de cada catálogo: cómo se lee y cómo se activa o desactiva una fila. Es una constante por catálogo (no se arma en cada render).
export type ConfigDelCatalogo<T> = {
  leer: () => Promise<Resultado<CatalogoLeido<T>>>
  mensajeDeLectura: string
  activar: (fila: T, activo: boolean) => Promise<Envio<unknown>>
  avisoActivado: string
  avisoDesactivado: string
}

// Un catálogo de transporte de Configuración (6.08-1): se lee al montar y otra vez tras cada escritura (la lista nunca queda vieja). `activar` escribe por la Server Action del catálogo y avisa.
export function useCatalogoDeTransporte<T>(config: ConfigDelCatalogo<T>) {
  const [lectura, setLectura] = useState<LecturaDeCatalogo<T>>({ tipo: 'cargando' })
  const { leer: leerCatalogo, mensajeDeLectura } = config

  const leer = useCallback(() => {
    let vigente = true
    void leerCatalogo()
      .catch(() => fallo('inesperado', mensajeDeLectura))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', filas: resultado.data.filas, hayMas: resultado.data.hayMas }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [leerCatalogo, mensajeDeLectura])

  useEffect(() => leer(), [leer])

  return {
    lectura,
    recargar: () => {
      leer()
    },
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      leer()
    },
    activar: async (fila: T, activo: boolean) => {
      const envio = await config.activar(fila, activo)
      if (envio.ok) {
        avisarExito(activo ? config.avisoActivado : config.avisoDesactivado)
        leer()
      } else {
        avisarError(envio.error)
      }
    },
  }
}
