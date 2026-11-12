'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import type { Gasto } from '../../../entities/dinero/gasto'
import { eliminarGasto } from '../actions/eliminar-gasto'
import { avisarCambioDeDinero } from './eventos-de-dinero'

const MENSAJE_DE_ELIMINAR = 'No se pudo eliminar el gasto.'

// Eliminar un gasto de la unidad (6.11-1): devuelve el motivo si la base no lo dejó (el diálogo lo dice adentro y sigue abierto). Un `PT409` («ya no existe», o lo cambió otra persona) no es un error
// para quien quería quitarlo: se vuelve a leer y se dice sin alarma.
export function useEliminarElGasto(unidadId: string) {
  return async function eliminar(gasto: Gasto): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      eliminarGasto({ id: gasto.id, actualizadoEnEsperado: gasto.actualizadoEn }),
      MENSAJE_DE_ELIMINAR,
    )
    if (envio.ok) {
      avisarCambioDeDinero(unidadId)
      avisarExito('Gasto eliminado.')
      return null
    }
    if (envio.error.codigo === 'conflicto') {
      avisarCambioDeDinero(unidadId)
      avisar('Ese gasto ya no estaba.')
      return null
    }
    return envio.error
  }
}
