'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  borradorConModo,
  type BorradorDeTipo,
} from '../../../entities/documentos/formulario-de-tipo'
import type { ModoDeVencimiento } from '../../../entities/documentos/tipo-de-documento'

type Errores = Record<string, string>

// Lo escrito en el modal de un tipo de documento y cómo cambia: cada cambio borra el motivo del campo que se corrige (lo que se corrige deja de
// decirse). Cambiar el modo vacía los días que ya no aplican (la base los rechaza): lo escrito no se pierde en silencio porque el campo desaparece.
export function useValoresDeTipo(
  inicial: BorradorDeTipo,
  setErrores: Dispatch<SetStateAction<Errores>>,
) {
  const [valores, setValores] = useState<BorradorDeTipo>(inicial)

  function sinMotivo(campos: readonly string[]) {
    setErrores((antes) =>
      Object.fromEntries(Object.entries(antes).filter(([clave]) => !campos.includes(clave))),
    )
  }

  function poner(cambios: Partial<BorradorDeTipo>, campos: readonly string[]) {
    setValores((antes) => ({ ...antes, ...cambios }))
    sinMotivo(campos)
  }

  return {
    valores,
    reponer: (cambios: Partial<BorradorDeTipo>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
    escribir: (cambios: Partial<BorradorDeTipo>, campo: string) => {
      poner(cambios, [campo])
    },
    elegirModo: (modo: ModoDeVencimiento) => {
      setValores((antes) => borradorConModo(antes, modo))
      sinMotivo(['modo_vencimiento', 'vigencia_dias', 'aviso_dias'])
    },
    alternarFormato: (formato: string, marcado: boolean) => {
      const sin = valores.formatos.filter((f) => f !== formato)
      poner({ formatos: marcado ? [...sin, formato] : sin }, ['formatos'])
    },
  }
}
