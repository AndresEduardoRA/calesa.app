'use client'

import { useState } from 'react'
import type { PlataformaApibara } from '@/shared/lib/apibara'
import { generoSugerido } from '../../../entities/nombre'
import type { Genero } from '../../../entities/origen'

export type ValoresDeOrigen = {
  nombre: string
  sustantivo: string
  genero: Genero
  color: string
  plataformas: PlataformaApibara[]
}

export const COLOR_INICIAL = '#465fff'

// El formulario de un origen. Mientras la persona no toque el género, acompaña al sustantivo
// («unidad» → femenino); en cuanto lo elige, es suyo.
export function useValoresDeOrigen(inicial: ValoresDeOrigen, generoYaElegido: boolean) {
  const [valores, setValores] = useState(inicial)
  const [generoElegido, setGeneroElegido] = useState(generoYaElegido)

  function cambiar(parcial: Partial<ValoresDeOrigen>) {
    if (parcial.genero !== undefined) {
      setGeneroElegido(true)
    }
    setValores((actuales) => {
      const siguiente = { ...actuales, ...parcial }
      if (parcial.sustantivo !== undefined && parcial.genero === undefined && !generoElegido) {
        siguiente.genero = generoSugerido(parcial.sustantivo)
      }
      return siguiente
    })
  }

  return { valores, cambiar }
}
