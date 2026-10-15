'use client'

import { useEffect, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import type { CandidatoDeCartera } from '../../../entities/cartera'
import { leerCandidatosDeCartera } from '../../../composicion.client'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'lista'; candidatos: CandidatoDeCartera[] }
  | { fase: 'error'; error: ErrorApp }

// A quién se le puede dar el lead: se lee al abrir el panel (la lista es la de ese momento) y se
// vuelve a leer con `reintentar`. Un panel cerrado no pide nada.
export function useCandidatos(leadId: string, activo: boolean) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!activo) {
      return
    }
    let vigente = true
    void leerCandidatosDeCartera(leadId).then((respuesta) => {
      if (!vigente) {
        return
      }
      setEstado(
        respuesta.ok
          ? { fase: 'lista', candidatos: respuesta.data }
          : { fase: 'error', error: respuesta.error },
      )
    })
    return () => {
      vigente = false
      setEstado({ fase: 'cargando' })
    }
  }, [leadId, activo, intento])

  return { estado, reintentar: () => setIntento((n) => n + 1) }
}
