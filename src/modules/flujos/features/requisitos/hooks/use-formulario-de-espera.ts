'use client'

import {
  BORRADOR_DE_ESPERA_NUEVO,
  esCampoDeEspera,
  validarEspera,
  type BorradorDeEspera,
  type CampoDeEspera,
} from '../../../entities/requisitos/formulario-de-espera'
import type { FaseDelOtroFlujo } from '../../../entities/requisitos/opciones'
import { useFormularioDeRequisito } from './use-formulario-de-requisito'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Args = {
  requisitos: RequisitosDeLaFase
  // Las fases activas del otro flujo que el selector ofrece.
  fases: readonly FaseDelOtroFlujo[]
  alCerrar: () => void
}

const MENSAJE_DE_EXITO = 'Requisito agregado. Nace informativo: vuélvelo bloqueante cuando quieras.'

// El formulario de «Espera»: lo común está en `useFormularioDeRequisito`.
export function useFormularioDeEspera({ requisitos, fases, alCerrar }: Args) {
  return useFormularioDeRequisito<
    BorradorDeEspera,
    CampoDeEspera,
    Parameters<typeof requisitos.agregar>[1]
  >({
    requisitos,
    inicial: BORRADOR_DE_ESPERA_NUEVO,
    esCampo: esCampoDeEspera,
    validar: (valores) => {
      const validado = validarEspera(valores, fases)
      return validado.ok ? { ok: true, valor: { tipo: 'espera', datos: validado.datos } } : validado
    },
    mandar: (contenido, intento) => requisitos.agregar(intento, contenido),
    mensajeDeExito: MENSAJE_DE_EXITO,
    alCerrar,
  })
}
