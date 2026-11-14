'use client'

import { useAction } from 'next-safe-action/hooks'
import { avisar, avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { accionesDeError, type AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import {
  errorDeEnvio,
  resumenDeEnvio,
  resumenDeRestauracion,
  type ResultadoDeEnvio,
} from '../../../entities/papelera'
import { respuestaDe } from '../../fotos/envio'
import { enviarAPapelera } from '../actions/enviar-a-papelera'
import { restaurarDePapelera } from '../actions/restaurar-de-papelera'

// Enviar a la papelera es reversible: se hace y se ofrece «Deshacer» 10 s. El resultado se dice
// entero: cuántos entraron, cuáles no y por qué. Deshacer restaura el lote con la versión que
// devolvió el envío; lo que estaba publicado vuelve sin publicar, y también se dice.
export function useEnvioAPapelera() {
  const enviando = useAction(enviarAPapelera)
  const restaurando = useAction(restaurarDePapelera)

  async function deshacer(envio: ResultadoDeEnvio) {
    if (!envio.lote || !envio.actualizadoEn) {
      return
    }
    const resultado = await respuestaDe(
      restaurando.executeAsync({ loteId: envio.lote, actualizadoEnEsperado: envio.actualizadoEn }),
    )
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    const sinPublicar = envio.enviados.some((uno) => uno.despublicado)
      ? ' Lo que estaba en la web volvió sin publicar.'
      : ''
    const dicho = resumenDeRestauracion(resultado.data) + sinPublicar
    if (resultado.data.pendientes.length > 0) {
      avisar(dicho)
    } else {
      avisarExito(dicho)
    }
  }

  // Devuelve si entró alguno (para que quien llama sepa si hay algo que sacar de la pantalla). Con `avisos` y un solo vehículo que no entró, el
  // aviso ofrece lo que corresponde a su causa; en un lote, sólo se listan los motivos.
  async function enviar(
    vehiculos: readonly { id: string; actualizadoEn: string }[],
    avisos?: AvisosDelMenu,
  ): Promise<boolean> {
    const resultado = await respuestaDe(enviando.executeAsync({ vehiculos: [...vehiculos] }))
    if (!resultado.ok) {
      avisarError(resultado.error)
      return false
    }
    const envio = resultado.data
    if (envio.enviados.length === 0) {
      const error = errorDeEnvio(envio)
      const delUnico = vehiculos.length === 1 ? avisos : undefined
      avisarError(
        error,
        delUnico
          ? {
              acciones: accionesDeError(
                error,
                delUnico.vehiculo,
                delUnico.alcance,
                delUnico.paraActividad,
              ),
            }
          : {},
      )
      return false
    }
    avisarConDeshacer(resumenDeEnvio(envio), () => {
      void deshacer(envio)
    })
    return true
  }

  return { enviar, enCurso: enviando.isPending || restaurando.isPending }
}
