'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import type { Pago } from '../../../entities/dinero/pago'
import { eliminarPago } from '../actions/eliminar-pago'
import { avisarCambioDeDinero } from './eventos-de-dinero'

const MENSAJE_DE_ELIMINAR = 'No se pudo eliminar el pago.'

// Eliminar un pago sin confirmar (6.11-2): devuelve el motivo si la base no lo dejó (el diálogo lo dice adentro y sigue abierto). Un `PT409` (ya lo confirmaron o ya no existe) no es un error para
// quien quería quitarlo: se vuelve a leer y se dice con el mensaje de la base, sin alarma.
export function useEliminarElPago(unidadId: string) {
  return async function eliminar(pago: Pago): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      eliminarPago({ id: pago.id, actualizadoEnEsperado: pago.actualizadoEn }),
      MENSAJE_DE_ELIMINAR,
    )
    if (envio.ok) {
      avisarCambioDeDinero(unidadId)
      avisarExito('Pago eliminado.')
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
