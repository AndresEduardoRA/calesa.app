'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { ResultadoDeDeshacer } from '../../../entities/importacion/deshacer'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { deshacerImportacionDeLeads } from '../actions/deshacer-importacion'

const SIN_RED: ErrorApp = {
  codigo: 'inesperado',
  mensaje: 'No pudimos llegar al servidor. Vuelve a intentar: nada se mueve dos veces.',
}

// Deshacer una importación: el resultado (cuántos salieron, qué se quedó y por qué) o el error, que la
// pantalla dice dentro de la confirmación. Repetirlo es seguro: la base devuelve lo mismo.
export function useDeshacerImportacion() {
  const accion = useAction(deshacerImportacionDeLeads)
  const [resultado, setResultado] = useState<ResultadoDeDeshacer | null>(null)
  const [error, setError] = useState<ErrorApp | null>(null)

  async function deshacer(importacionId: string): Promise<boolean> {
    setError(null)
    const envio = await enviarAccion<ResultadoDeDeshacer>(
      accion.executeAsync({ importacionId }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError('sinRed' in envio ? SIN_RED : envio.error)
      return false
    }
    setResultado(envio.data)
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
