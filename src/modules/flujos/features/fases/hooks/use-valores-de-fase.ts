'use client'

import { useMemo, useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  ID_DE_CAMPO_DE_FASE,
  bloquesConError,
  primerCampoConError,
} from '../../../entities/fases/bloques-de-fase'
import { valoresDeFase } from '../../../entities/fases/formulario-de-fase'
import type {
  CampoDeFase,
  ErroresDeFase,
  ValoresDeFase,
} from '../../../entities/fases/reglas-de-fase'
import type { FaseParaConfigurar } from '../../../entities/flujo'

// El control de un campo, o, si el `id` es de una tarjeta (un interruptor), el primero que haya dentro.
function controlDe(id: string): HTMLElement | null {
  const elemento = document.getElementById(id)
  if (elemento === null || elemento.matches('input, textarea, button, select')) {
    return elemento
  }
  return elemento.querySelector<HTMLElement>('input, textarea, button, select')
}

// El bloque que se abre por un error aparece en el cuadro siguiente: el foco espera dos.
function enfocarCampo(campo: CampoDeFase) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      controlDe(ID_DE_CAMPO_DE_FASE[campo])?.focus()
    })
  })
}

// Lo escrito en «Datos» de una fase, el motivo junto a cada campo y el borrador: 17 campos, así que en `sessionStorage` (uno por fase). El foco de un
// error va al primer campo con error en el orden en que se ven.
export function useValoresDeFase(fase: FaseParaConfigurar) {
  const guardado = useMemo(() => valoresDeFase(fase), [fase])
  const [valores, setValores] = useState<ValoresDeFase>(guardado)
  const [errores, setErrores] = useState<ErroresDeFase>({})
  const borrador = useBorradorDeEstado({
    clave: `fase-${fase.id}`,
    valores,
    guardado,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })

  return {
    valores,
    errores,
    // Los bloques con un error adentro no pueden quedar plegados.
    conError: bloquesConError(errores),
    // Lo escrito que todavía no está en la base.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(guardado),
    escribir: (cambios: Partial<ValoresDeFase>, campo: CampoDeFase) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      setErrores((antes) => {
        const { [campo]: _quitado, ...resto } = antes
        return resto
      })
    },
    mostrarErrores: (nuevos: ErroresDeFase) => {
      setErrores(nuevos)
      const primero = primerCampoConError(nuevos)
      if (primero !== null) {
        enfocarCampo(primero)
      }
    },
    // Ya está en la base: el borrador sobraría.
    guardado: borrador.limpiar,
    // «Cancelar»: vuelve a lo guardado y tira el borrador.
    descartar: () => {
      borrador.limpiar()
      setValores(guardado)
      setErrores({})
    },
  }
}
