'use client'

import { useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import {
  BORRADOR_DE_DATO_NUEVO,
  esCampoDeDato,
  validarDato,
  type BorradorDeDato,
  type CampoDeDato,
} from '../../../entities/requisitos/formulario-de-dato'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Args = {
  requisitos: RequisitosDeLaFase
  ambito: AmbitoDeFlujo
  alCerrar: () => void
}

type Errores = Partial<Record<CampoDeDato, string>>

const MENSAJE_DE_EXITO = 'Requisito agregado. Nace informativo: vuélvelo bloqueante cuando quieras.'

// El estado del formulario de «Dato»: lo escrito, el motivo junto a cada campo y el envío. El id del intento nace al abrir y se conserva en cada reintento
// (repetirlo no duplica). Un conflicto lo dice el aviso de arriba del flujo y lo escrito se conserva; cualquier otro rechazo que la base ata a un campo
// va junto a ese campo, y el resto, arriba del formulario.
export function useFormularioDeDato({ requisitos, ambito, alCerrar }: Args) {
  const { locale } = useRegional()
  const [intento] = useState(() => crypto.randomUUID())
  const [valores, setValores] = useState<BorradorDeDato>(BORRADOR_DE_DATO_NUEVO)
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<string | null>(null)

  function escribir(cambios: Partial<BorradorDeDato>, campo: CampoDeDato) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => ({ ...antes, [campo]: undefined }))
  }

  async function enviar(formulario: HTMLFormElement | null): Promise<boolean> {
    const validado = validarDato(valores, ambito, locale)
    if (!validado.ok) {
      setErrores(validado.errores)
      setAviso(null)
      // El foco va al primer campo con error cuando ya se dibujó.
      requestAnimationFrame(() => {
        enfocarPrimerError(formulario)
      })
      return false
    }
    setAviso(null)
    const envio = await requisitos.agregar(intento, { tipo: 'dato', datos: validado.datos })
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      avisarExito(MENSAJE_DE_EXITO)
      alCerrar()
      return true
    }
    // Otro intento con el mismo id ya lo creó (se perdió la respuesta): está hecho.
    if (envio.error.codigo === 'duplicado' && !('sinRed' in envio)) {
      requisitos.releer()
      alCerrar()
      return true
    }
    const campo =
      'porCampo' in envio ? Object.keys(envio.porCampo ?? {}).find(esCampoDeDato) : undefined
    if (campo !== undefined && 'porCampo' in envio) {
      setErrores({ [campo]: envio.porCampo?.[campo] })
      requestAnimationFrame(() => {
        enfocarPrimerError(formulario)
      })
    } else if (envio.error.codigo === 'conflicto') {
      requisitos.rechazar(envio)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    valores,
    errores,
    aviso,
    enCurso: requisitos.enCurso,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(BORRADOR_DE_DATO_NUEVO),
    escribir,
    enviar,
  }
}
