'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { LoteDeCotizaciones } from '../../../entities/papelera/lotes'
import {
  resumenDeRestauracion,
  type ResultadoDeRestaurar,
} from '../../../entities/papelera/resultados'
import { restaurarCotizacionesDePapelera } from '../actions/restaurar-de-papelera'

const MENSAJE_DE_VALIDACION = 'No se pudo restaurar.'

// Sobre qué se actúa: un lote entero o una de sus cotizaciones.
export type Objetivo = { lote: LoteDeCotizaciones; cotizacionId?: string }

const pedidoDe = ({ lote, cotizacionId }: Objetivo) => ({
  loteId: lote.id,
  actualizadoEnEsperado: lote.actualizadoEn,
  ...(cotizacionId ? { cotizaciones: [cotizacionId] } : {}),
})

// Restaurar desde la papelera: manda la versión del lote que está en pantalla y dice el resultado entero. Se hace sin preguntar (enviar de nuevo lo deshace).
// Ninguna restaurada es un error de regla; con alguna pendiente, un aviso; todas, un éxito.
export function usePapelera() {
  const restaurando = useAction(restaurarCotizacionesDePapelera)

  async function restaurar(objetivo: Objetivo) {
    const resultado = await enviarAccion<ResultadoDeRestaurar>(
      restaurando.executeAsync(pedidoDe(objetivo)),
      MENSAJE_DE_VALIDACION,
    )
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    const dicho = resumenDeRestauracion(resultado.data)
    if (resultado.data.restaurados.length === 0) {
      avisarError({ codigo: 'regla', mensaje: dicho })
    } else if (resultado.data.pendientes.length > 0) {
      avisar(dicho)
    } else {
      avisarExito(dicho)
    }
  }

  return { restaurar, enCurso: restaurando.isPending }
}
