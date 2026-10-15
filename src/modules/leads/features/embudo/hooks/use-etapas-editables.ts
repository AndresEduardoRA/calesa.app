'use client'

import { useState } from 'react'
import { conFinal, conInicial, etapaNueva, moverEtapa, type Etapa } from '../../../entities/embudo'
import type { ColorDeEtiqueta } from '../../../entities/etiqueta'

// Las etapas mientras se editan en el panel: cada cambio es una regla pura de `entities/embudo` y
// borra el motivo que se estaba mostrando (`alCambiar`).
export function useEtapasEditables(inicial: readonly Etapa[], alCambiar: () => void) {
  const [etapas, setEtapas] = useState<Etapa[]>([...inicial])
  function editar(cambio: (lista: Etapa[]) => Etapa[]) {
    setEtapas((lista) => cambio(lista))
    alCambiar()
  }
  return {
    etapas,
    renombrarEtapa: (i: number, valor: string) => {
      editar((l) => l.map((e, j) => (j === i ? { ...e, nombre: valor } : e)))
    },
    colorear: (i: number, color: ColorDeEtiqueta) => {
      editar((l) => l.map((e, j) => (j === i ? { ...e, color } : e)))
    },
    marcarInicial: (i: number) => {
      editar((l) => conInicial(l, i))
    },
    marcarFinal: (i: number, cual: 'ganada' | 'perdida', valor: boolean) => {
      editar((l) => conFinal(l, i, cual, valor))
    },
    subir: (i: number) => {
      editar((l) => moverEtapa(l, i, -1))
    },
    bajar: (i: number) => {
      editar((l) => moverEtapa(l, i, 1))
    },
    quitar: (i: number) => {
      editar((l) => l.filter((_, j) => j !== i))
    },
    agregar: () => {
      editar((l) => [...l, etapaNueva(l)])
    },
  }
}
