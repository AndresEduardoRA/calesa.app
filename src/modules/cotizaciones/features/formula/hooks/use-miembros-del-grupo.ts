'use client'

import { useState } from 'react'

type Fila = { id: string; etiqueta: string }

// Las filas de un grupo mientras se edita (4.21-3c, C4): empiezan en las que tiene y cambian con «Quitar» y «Sumar», sin tocar la fórmula hasta «Aplicar».
// `candidatas` son todas las filas que pueden sumar, en el orden de la fórmula: lo que queda se dibuja en ese orden.
export function useMiembrosDelGrupo<T extends Fila>(
  originales: readonly Fila[],
  candidatas: readonly T[],
) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set(originales.map((f) => f.id)))
  const enOrden = new Set(candidatas.map((f) => f.id))
  // Una fila del grupo que no puede sumar (la fórmula no valida) va primero, para poder quitarla.
  const quedan: Fila[] = [
    ...originales.filter((f) => ids.has(f.id) && !enOrden.has(f.id)),
    ...candidatas.filter((f) => ids.has(f.id)),
  ]
  return {
    ids: [...quedan.map((f) => f.id)],
    quedan,
    libres: candidatas.filter((f) => !ids.has(f.id)),
    quitar: (id: string) => {
      setIds((antes) => new Set([...antes].filter((x) => x !== id)))
    },
    sumar: (id: string) => {
      setIds((antes) => new Set([...antes, id]))
    },
  }
}
