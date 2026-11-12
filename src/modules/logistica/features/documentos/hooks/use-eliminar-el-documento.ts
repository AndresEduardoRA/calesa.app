'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { eliminarDocumento } from '../actions/eliminar-documento'

const MENSAJE_DE_ELIMINAR = 'No se pudo eliminar el documento.'

// Eliminar un documento (6.06-3): devuelve el motivo si la base no lo dejó (el diálogo lo dice adentro y sigue abierto; p. ej. «La fase «X» exige este documento»). Un `PT409` (ya no está o
// lo cambiaron) no es un error para quien quería quitarlo: se vuelve a leer y se dice con el mensaje de la base, sin alarma.
export function useEliminarElDocumento(unidadId: string) {
  return async function eliminar(documento: DocumentoDeLaUnidad): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      eliminarDocumento({ id: documento.id, actualizadoEnEsperado: documento.actualizadoEn }),
      MENSAJE_DE_ELIMINAR,
    )
    if (envio.ok) {
      avisarCambioDeLaUnidad(unidadId)
      avisarExito('Documento eliminado.')
      return null
    }
    if (envio.error.codigo === 'conflicto') {
      avisarCambioDeLaUnidad(unidadId)
      avisar(envio.error.mensaje)
      return null
    }
    return envio.error
  }
}
