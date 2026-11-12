'use client'

import { useRegional } from '@/shared/ui/regional'
import {
  BORRADOR_DE_DOCUMENTO_NUEVO,
  esCampoDeDocumento,
  validarDocumento,
  type BorradorDeDocumento,
  type CampoDeDocumento,
} from '../../../entities/requisitos/formulario-de-documento'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'
import { useFormularioDeRequisito } from './use-formulario-de-requisito'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Args = {
  requisitos: RequisitosDeLaFase
  // Los tipos activos que el selector ofrece.
  tipos: readonly TipoParaRequisito[]
  alCerrar: () => void
}

const MENSAJE_DE_EXITO = 'Requisito agregado. Nace informativo: vuélvelo bloqueante cuando quieras.'

// El formulario de «Documento»: lo común está en `useFormularioDeRequisito`. Cambiar de tipo vacía los formatos marcados (los del tipo anterior).
export function useFormularioDeDocumento({ requisitos, tipos, alCerrar }: Args) {
  const { locale } = useRegional()
  const f = useFormularioDeRequisito<
    BorradorDeDocumento,
    CampoDeDocumento,
    Parameters<typeof requisitos.agregar>[1]
  >({
    requisitos,
    inicial: BORRADOR_DE_DOCUMENTO_NUEVO,
    esCampo: esCampoDeDocumento,
    validar: (valores) => {
      const validado = validarDocumento(valores, tipos, locale)
      return validado.ok
        ? { ok: true, valor: { tipo: 'documento', datos: validado.datos } }
        : validado
    },
    mandar: (contenido, intento) => requisitos.agregar(intento, contenido),
    mensajeDeExito: MENSAJE_DE_EXITO,
    alCerrar,
  })
  return {
    ...f,
    elegirTipo: (tipoId: string) => {
      f.escribir({ tipoId, formatos: [] }, 'tipo_documento_id')
    },
  }
}
