'use client'

import type { AmbitoDeFlujo } from '../../../entities/flujo'
import {
  BORRADOR_DE_DATO_NUEVO,
  esCampoDeDato,
  validarDato,
  type BorradorDeDato,
  type CampoDeDato,
} from '../../../entities/requisitos/formulario-de-dato'
import { useRegional } from '@/shared/ui/regional'
import { useFormularioDeRequisito } from './use-formulario-de-requisito'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Args = {
  requisitos: RequisitosDeLaFase
  ambito: AmbitoDeFlujo
  alCerrar: () => void
}

const MENSAJE_DE_EXITO = 'Requisito agregado. Nace informativo: vuélvelo bloqueante cuando quieras.'

// El formulario de «Dato»: lo común (el id del intento, los motivos junto a cada campo, el envío) está en `useFormularioDeRequisito`.
export function useFormularioDeDato({ requisitos, ambito, alCerrar }: Args) {
  const { locale } = useRegional()
  return useFormularioDeRequisito<
    BorradorDeDato,
    CampoDeDato,
    Parameters<typeof requisitos.agregar>[1]
  >({
    requisitos,
    inicial: BORRADOR_DE_DATO_NUEVO,
    esCampo: esCampoDeDato,
    validar: (valores) => {
      const validado = validarDato(valores, ambito, locale)
      return validado.ok ? { ok: true, valor: { tipo: 'dato', datos: validado.datos } } : validado
    },
    mandar: (contenido, intento) => requisitos.agregar(intento, contenido),
    mensajeDeExito: MENSAJE_DE_EXITO,
    alCerrar,
  })
}
