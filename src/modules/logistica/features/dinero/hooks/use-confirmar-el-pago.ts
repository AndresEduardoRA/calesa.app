'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import type { Pago } from '../../../entities/dinero/pago'
import { confirmarPago } from '../actions/confirmar-pago'
import { avisarCambioDeDinero } from './eventos-de-dinero'

const MENSAJE_DE_CONFIRMAR = 'No se pudo confirmar el pago.'

// Confirmar un pago (6.11-2): lo sella. Al confirmar, la lista muestra el sello y el hueco «Margen» se vuelve a leer (lo avisa `avisarCambioDeDinero`). Devuelve el motivo si la base no lo dejó (sin
// permiso: el diálogo lo dice adentro y sigue abierto). Un `PT409` («Ana ya lo confirmó hace 2 min») no es un error para quien confirmaba: se vuelve a leer y se dice sin alarma.
export function useConfirmarElPago(unidadId: string) {
  return async function confirmar(pago: Pago): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      confirmarPago({ id: pago.id, actualizadoEnEsperado: pago.actualizadoEn }),
      MENSAJE_DE_CONFIRMAR,
    )
    if (envio.ok) {
      avisarCambioDeDinero(unidadId)
      avisarExito('Pago confirmado.')
      return null
    }
    if (envio.error.codigo === 'conflicto') {
      avisarCambioDeDinero(unidadId)
      avisar(envio.error.mensaje)
      return null
    }
    return envio.error
  }
}
