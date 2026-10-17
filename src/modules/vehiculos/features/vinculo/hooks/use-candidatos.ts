'use client'

import { useEffect, useState } from 'react'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import { buscarCandidatos } from '../../../composicion.client'
import type { CandidatoDeVinculo } from '../../../entities/vehiculos-del-lead'

const ESPERA_MS = 250

export type Busqueda =
  | { estado: 'cargando' }
  | { estado: 'lista'; candidatos: CandidatoDeVinculo[]; hayMas: boolean }
  | { estado: 'error'; error: ErrorApp }

// Los vehículos que quien mira ve, buscados por título, VIN, lote o #número mientras escribe (sin
// texto, los más nuevos). Se lee al abrir el panel y un momento después de cada tecla. Cada respuesta
// guarda el pedido que la trajo: mientras no llega la del texto actual, se está cargando, y una que
// llega tarde (de un texto anterior) no se muestra.
export function useCandidatos(leadId: string, texto: string) {
  const [intento, setIntento] = useState(0)
  const clave = `${leadId}|${texto.trim()}|${String(intento)}`
  const [respuesta, setRespuesta] = useState<{
    clave: string
    resultado: Resultado<{ candidatos: CandidatoDeVinculo[]; hayMas: boolean }>
  } | null>(null)

  useEffect(() => {
    let vigente = true
    const espera = setTimeout(() => {
      void buscarCandidatos({ leadId, texto: texto.trim() }).then((resultado) => {
        if (vigente) {
          setRespuesta({ clave, resultado })
        }
      })
    }, ESPERA_MS)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [clave, leadId, texto])

  const busqueda: Busqueda =
    respuesta?.clave !== clave
      ? { estado: 'cargando' }
      : respuesta.resultado.ok
        ? { estado: 'lista', ...respuesta.resultado.data }
        : { estado: 'error', error: respuesta.resultado.error }

  return {
    busqueda,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
