'use client'

import { useRegional } from '@/shared/ui/regional'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import {
  MENSAJE_SIN_CAMBIOS,
  borradorDeEdicion,
  esCampoDeEdicion,
  validarEdicion,
  type BorradorDeEdicion,
  type CampoDeEdicion,
  type CambiosDeRequisito,
} from '../../../entities/requisitos/formulario-de-edicion'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'
import { useFormularioDeRequisito } from './use-formulario-de-requisito'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Args = {
  requisitos: RequisitosDeLaFase
  requisito: RequisitoParaConfigurar
  // El tipo de documento del requisito, si ya se leyó.
  tipo: TipoParaRequisito | null
  alCerrar: () => void
}

// El formulario de «Editar»: arranca con lo que el requisito tiene hoy y manda sólo lo que cambió. Sin cambios no llama a la base y lo dice en el formulario.
export function useFormularioDeEdicion({ requisitos, requisito, tipo, alCerrar }: Args) {
  const { locale } = useRegional()
  return useFormularioDeRequisito<BorradorDeEdicion, CampoDeEdicion, CambiosDeRequisito>({
    requisitos,
    inicial: borradorDeEdicion(requisito),
    esCampo: esCampoDeEdicion,
    validar: (valores) => {
      const validado = validarEdicion(requisito, valores, tipo, locale)
      if (validado.tipo === 'cambios') {
        return { ok: true, valor: validado.cambios }
      }
      return validado.tipo === 'errores'
        ? { ok: false, errores: validado.errores }
        : { ok: false, errores: {}, aviso: MENSAJE_SIN_CAMBIOS }
    },
    mandar: (cambios) => requisitos.guardar(requisito.id, cambios),
    mensajeDeExito: 'Requisito guardado.',
    alCerrar,
  })
}
