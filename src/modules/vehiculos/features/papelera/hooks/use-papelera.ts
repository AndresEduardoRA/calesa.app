'use client'

import { useAction } from 'next-safe-action/hooks'
import type { Resultado } from '@/shared/lib/errores'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  resumenDePurga,
  resumenDeRestauracion,
  type LoteDePapelera,
  type ResultadoDePurgar,
} from '../../../entities/papelera'
import { respuestaDe } from '../../fotos/envio'
import { purgarDePapelera } from '../actions/purgar-de-papelera'
import { restaurarDePapelera } from '../actions/restaurar-de-papelera'

// Sobre qué se actúa: un lote entero o uno de sus vehículos.
export type Objetivo = { lote: LoteDePapelera; vehiculoId?: string }

const pedidoDe = ({ lote, vehiculoId }: Objetivo) => ({
  loteId: lote.id,
  actualizadoEnEsperado: lote.actualizadoEn,
  ...(vehiculoId ? { vehiculos: [vehiculoId] } : {}),
})

// Restaurar y purgar desde la papelera. Las dos mandan la versión del lote que está en pantalla y
// dicen el resultado entero. Restaurar se hace sin preguntar (enviar de nuevo lo deshace); purgar
// no avisa acá: quien la pide tiene un diálogo abierto y decide qué mostrar.
export function usePapelera() {
  const restaurando = useAction(restaurarDePapelera)
  const purgando = useAction(purgarDePapelera)

  async function restaurar(objetivo: Objetivo) {
    const resultado = await respuestaDe(restaurando.executeAsync(pedidoDe(objetivo)))
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
    const resultado = await respuestaDe(purgando.executeAsync(pedidoDe(objetivo)))
    if (resultado.ok) {
      const dicho = resumenDePurga(resultado.data)
      if (resultado.data.purgados.length === 0) {
        avisarError({ codigo: 'regla', mensaje: dicho })
      } else if (resultado.data.bloqueados.length > 0) {
        avisar(dicho)
      } else {
        avisarExito(dicho)
      }
    }
    return resultado
  }

  return { restaurar, purgar, enCurso: restaurando.isPending || purgando.isPending }
}
