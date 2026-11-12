'use client'

import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { avisarExito } from '@/shared/ui/toasts'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { revisarDocumento } from '../actions/revisar-documento'
import { resultadoDelEnvio } from './resultado-del-envio'

const MENSAJE_DE_REVISAR = 'No se pudo revisar el documento.'

// Aprobar o rechazar un documento desde su fila (6.06-3). Devuelve `true` si quedó. Un `PT409` no se pierde en un aviso que se va: queda en la fila (`conflicto`) hasta que llega la versión
// nueva, y lo escrito (el motivo) se conserva. Un solo envío a la vez: una referencia, no el estado, porque un doble clic llega antes de que el estado cambie.
export function useRevisarElDocumento(unidadId: string, documento: DocumentoDeLaUnidad) {
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(documento.actualizadoEn)
  const ocupado = useRef(false)

  async function revisar(
    estado: 'aprobado' | 'rechazado',
    motivo: string | null,
  ): Promise<boolean> {
    if (ocupado.current) return false
    ocupado.current = true
    setEnCurso(true)
    setError(null)
    const resultado = resultadoDelEnvio(
      await enviarAccion(
        revisarDocumento({
          id: documento.id,
          actualizadoEnEsperado: documento.actualizadoEn,
          estado,
          motivo,
        }),
        MENSAJE_DE_REVISAR,
      ),
    )
    setEnCurso(false)
    ocupado.current = false
    if (resultado.tipo === 'ok') {
      avisarCambioDeLaUnidad(unidadId)
      avisarExito(estado === 'aprobado' ? 'Documento aprobado.' : 'Documento rechazado.')
      return true
    }
    if (resultado.tipo === 'conflicto') {
      setConflicto(resultado.mensaje)
    } else {
      setError(resultado.mensaje)
    }
    return false
  }

  return { revisar, enCurso, error, conflicto }
}
