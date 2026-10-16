'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { ResultadoDeDeshacer } from '../../../entities/importacion/deshacer'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { deshacerImportacionDeLeads } from '../actions/deshacer-importacion'
import { anotarDeshecha, useDeshecha } from './deshechas'

const SIN_RED: ErrorApp = {
  codigo: 'inesperado',
  mensaje: 'No pudimos llegar al servidor. Vuelve a intentar: nada se mueve dos veces.',
}

// Deshacer una importación: el resultado (cuántos salieron, qué se quedó y por qué) o el error, que la
// pantalla dice dentro de la confirmación. Repetirlo es seguro: la base devuelve lo mismo. El resultado
// es de la importación, no de este botón: lo ven todos los «Deshacer» de la misma (`deshechas.ts`).
export function useDeshacerImportacion(importacionId: string) {
  const accion = useAction(deshacerImportacionDeLeads)
  const resultado = useDeshecha(importacionId)
  const [error, setError] = useState<ErrorApp | null>(null)

  async function deshacer(): Promise<boolean> {
    setError(null)
    const envio = await enviarAccion<ResultadoDeDeshacer>(
      accion.executeAsync({ importacionId }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError('sinRed' in envio ? SIN_RED : envio.error)
      return false
    }
    anotarDeshecha(importacionId, envio.data)
    return true
  }

  return {
    deshacer,
    enCurso: accion.isPending,
    resultado,
    error,
    limpiarError: () => {
      setError(null)
    },
  }
}
