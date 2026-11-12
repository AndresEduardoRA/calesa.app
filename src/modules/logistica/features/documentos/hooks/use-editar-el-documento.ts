'use client'

import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import type { PedidoDeEdicion } from '../../../entities/documentos/repositorio-de-revision'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { editarDocumento } from '../actions/editar-documento'
import { resultadoDelEnvio } from './resultado-del-envio'

const MENSAJE_DE_EDITAR = 'No se pudo guardar el documento.'

// Editar un documento desde su fila (6.06-3): las fechas, la nota o «Visible en el portal», sólo lo que cambió y con la versión de la fila. Devuelve `true` si quedó. Un `PT409` queda
// en la fila (`conflicto`) hasta que llega la versión nueva; un rechazo de la base se dice (`error`) y, si nombra un campo, junto a él (`porCampo`). Un solo envío a la vez.
export function useEditarElDocumento(unidadId: string, documento: DocumentoDeLaUnidad) {
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<Record<string, string>>({})
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(documento.actualizadoEn)
  const ocupado = useRef(false)

  async function editar(cambios: PedidoDeEdicion['cambios'], exito: string): Promise<boolean> {
    if (ocupado.current) return false
    ocupado.current = true
    setEnCurso(true)
    setError(null)
    setPorCampo({})
    const resultado = resultadoDelEnvio(
      await enviarAccion(
        editarDocumento({
          id: documento.id,
          actualizadoEnEsperado: documento.actualizadoEn,
          cambios,
        }),
        MENSAJE_DE_EDITAR,
      ),
    )
    setEnCurso(false)
    ocupado.current = false
    if (resultado.tipo === 'ok') {
      avisarCambioDeLaUnidad(unidadId)
      avisarExito(exito)
      return true
    }
    if (resultado.tipo === 'conflicto') {
      setConflicto(resultado.mensaje)
    } else {
      setPorCampo(resultado.porCampo ?? {})
      setError(resultado.porCampo ? null : resultado.mensaje)
    }
    return false
  }

  return { editar, enCurso, error, porCampo, conflicto }
}
