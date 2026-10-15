'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  resumenDePurga,
  resumenDeRestauracion,
  type LoteDePapelera,
  type ResultadoDePurgar,
  type ResultadoDeRestaurar,
} from '../../../entities/papelera'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { purgarLeadsDePapelera } from '../actions/purgar-de-papelera'
import { restaurarLeadsDePapelera } from '../actions/restaurar-de-papelera'

// Sobre qué se actúa: un lote entero o uno de sus leads.
export type Objetivo = { lote: LoteDePapelera; leadId?: string }

const pedidoDe = ({ lote, leadId }: Objetivo) => ({
  loteId: lote.id,
  actualizadoEnEsperado: lote.actualizadoEn,
  ...(leadId ? { leads: [leadId] } : {}),
})

// Restaurar y purgar desde la papelera. Las dos mandan la versión del lote que está en pantalla y
// dicen el resultado entero. Restaurar se hace sin preguntar (enviar de nuevo lo deshace); purgar no
// avisa acá: quien la pide tiene un diálogo abierto y decide qué mostrar.
export function usePapelera() {
  const restaurando = useAction(restaurarLeadsDePapelera)
  const purgando = useAction(purgarLeadsDePapelera)

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
      avisarError({ codigo: 'duplicado', mensaje: dicho })
    } else if (resultado.data.pendientes.length > 0) {
      avisar(dicho)
    } else {
      avisarExito(dicho)
    }
  }

  async function purgar(objetivo: Objetivo): Promise<Resultado<ResultadoDePurgar>> {
    const resultado = await enviarAccion<ResultadoDePurgar>(
      purgando.executeAsync(pedidoDe(objetivo)),
      MENSAJE_DE_VALIDACION,
    )
    if (!resultado.ok) {
      return { ok: false, error: resultado.error }
    }
    const dicho = resumenDePurga(resultado.data)
    if (resultado.data.purgados.length === 0) {
      avisarError({ codigo: 'regla', mensaje: dicho })
    } else if (resultado.data.bloqueados.length > 0) {
      avisar(dicho)
    } else {
      avisarExito(dicho)
    }
    return resultado
  }

  return { restaurar, purgar, enCurso: restaurando.isPending || purgando.isPending }
}
