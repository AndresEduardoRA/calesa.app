'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { LoteDeCotizaciones } from '../../../entities/papelera/lotes'
import {
  resumenDePurga,
  resumenDeRestauracion,
  type ResultadoDePurgar,
  type ResultadoDeRestaurar,
} from '../../../entities/papelera/resultados'
import { purgarCotizacionesDePapelera } from '../actions/purgar-de-papelera'
import { restaurarCotizacionesDePapelera } from '../actions/restaurar-de-papelera'

const NO_SE_RESTAURO = 'No se pudo restaurar.'
const NO_SE_PURGO = 'No se pudo purgar.'

// Sobre qué se actúa: un lote entero o una de sus cotizaciones.
export type Objetivo = { lote: LoteDeCotizaciones; cotizacionId?: string }

const pedidoDe = ({ lote, cotizacionId }: Objetivo) => ({
  loteId: lote.id,
  actualizadoEnEsperado: lote.actualizadoEn,
  ...(cotizacionId ? { cotizaciones: [cotizacionId] } : {}),
})

// Lo hecho, dicho entero: ninguna hecha es un error de regla; con alguna sin hacer, un aviso; todas, un éxito.
function avisarDelResultado(dicho: string, hechas: number, sinHacer: number) {
  if (hechas === 0) {
    avisarError({ codigo: 'regla', mensaje: dicho })
  } else if (sinHacer > 0) {
    avisar(dicho)
  } else {
    avisarExito(dicho)
  }
}

// Restaurar y purgar desde la papelera: mandan la versión del lote que está en pantalla y dicen el resultado entero. Restaurar se hace sin preguntar (enviar
// de nuevo lo deshace); purgar lo confirma `<ConfirmarPurga>`, que dice dentro del diálogo lo que la base rechazó (por eso no lo avisa aquí).
export function usePapelera() {
  const restaurando = useAction(restaurarCotizacionesDePapelera)
  const purgando = useAction(purgarCotizacionesDePapelera)

  async function restaurar(objetivo: Objetivo) {
    const resultado = await enviarAccion<ResultadoDeRestaurar>(
      restaurando.executeAsync(pedidoDe(objetivo)),
      NO_SE_RESTAURO,
    )
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    const { restaurados, pendientes } = resultado.data
    avisarDelResultado(resumenDeRestauracion(resultado.data), restaurados.length, pendientes.length)
  }

  async function purgar(objetivo: Objetivo): Promise<Resultado<ResultadoDePurgar>> {
    const resultado = await enviarAccion<ResultadoDePurgar>(
      purgando.executeAsync(pedidoDe(objetivo)),
      NO_SE_PURGO,
    )
    if (!resultado.ok) {
      return { ok: false, error: resultado.error }
    }
    const { purgados, bloqueados } = resultado.data
    avisarDelResultado(resumenDePurga(resultado.data), purgados.length, bloqueados.length)
    return resultado
  }

  return { restaurar, purgar, enCurso: restaurando.isPending || purgando.isPending }
}
