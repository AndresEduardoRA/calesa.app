'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRef } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisar, avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  resumenDeEnvio,
  resumenDeRestauracion,
  type ResultadoDeEnvio,
  type ResultadoDeRestaurar,
} from '../../../entities/papelera'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { enviarLeadsAPapelera } from '../actions/enviar-a-papelera'
import { restaurarLeadsDePapelera } from '../actions/restaurar-de-papelera'

// Enviar a la papelera es reversible: se hace y se ofrece «Deshacer» 10 s. Es todo o nada: si uno no
// se puede, no entra ninguno y el motivo dice cuál. El id del lote lo genera el cliente y se
// conserva hasta que el envío termina, así un reintento tras perder la respuesta no lo duplica.
// «Deshacer» restaura el lote con la versión que devolvió el envío.
export function useEnvioAPapelera() {
  const enviando = useAction(enviarLeadsAPapelera)
  const restaurando = useAction(restaurarLeadsDePapelera)
  const pendiente = useRef<string | null>(null)

  async function deshacer(envio: ResultadoDeEnvio) {
    const resultado = await enviarAccion<ResultadoDeRestaurar>(
      restaurando.executeAsync({ loteId: envio.lote, actualizadoEnEsperado: envio.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    const dicho = resumenDeRestauracion(resultado.data)
    if (resultado.data.pendientes.length > 0) {
      avisar(dicho)
    } else {
      avisarExito(dicho)
    }
  }

  // Devuelve si entraron (para que quien llama sepa si hay algo que sacar de la pantalla).
  async function enviar(leads: readonly string[]): Promise<boolean> {
    pendiente.current ??= crypto.randomUUID()
    const resultado = await enviarAccion<ResultadoDeEnvio>(
      enviando.executeAsync({ loteId: pendiente.current, leads: [...leads] }),
      MENSAJE_DE_VALIDACION,
    )
    if (!resultado.ok) {
      // Lo que no llegó se reintenta con el mismo lote; lo que la base rechazó, con uno nuevo.
      if (!('sinRed' in resultado)) {
        pendiente.current = null
      }
      avisarError(resultado.error)
      return false
    }
    pendiente.current = null
    const envio = resultado.data
    avisarConDeshacer(resumenDeEnvio(envio), () => {
      void deshacer(envio)
    })
    return true
  }

  return { enviar, enCurso: enviando.isPending || restaurando.isPending }
}
