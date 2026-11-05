'use client'

import { useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerCatalogoDelPanel } from '../../../composicion.client'
import type { CatalogosDeLead, TipoDeLeadEnCatalogo } from '../../../entities/catalogos'

export const MENSAJE_DE_LECTURA = 'No se pudieron cargar los leads.'

// El catálogo de tipos del panel del cliente, leído al montar y de nuevo con cada `intento` («Reintentar»): `tipos` es nulo mientras no llega o si falló
// (entonces `error` lo dice). Una respuesta de un intento anterior no se muestra.
export function useCatalogoDelPanel(intento: number): {
  tipos: readonly TipoDeLeadEnCatalogo[] | null
  error: ErrorApp | null
} {
  const [leido, setLeido] = useState<{
    intento: number
    resultado: Resultado<CatalogosDeLead>
  } | null>(null)
  useEffect(() => {
    let vigente = true
    leerCatalogoDelPanel()
      .catch(() => fallo('inesperado', MENSAJE_DE_LECTURA))
      .then((resultado) => {
        if (vigente) {
          setLeido({ intento, resultado })
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [intento])
  if (leido?.intento !== intento) {
    return { tipos: null, error: null }
  }
  return leido.resultado.ok
    ? { tipos: leido.resultado.data.tipos, error: null }
    : { tipos: null, error: leido.resultado.error }
}
