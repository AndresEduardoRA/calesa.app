'use client'

import { useEffect } from 'react'
import { separarNiveles, type ListaDeNiveles, type NivelDeAcceso } from '../../../entities/nivel'
import { menuDeNivel } from '../components/acciones-de-nivel'
import type { FilaDeNivel } from '../components/lista-de-niveles'
import type { Niveles } from './use-niveles'

type Quehaceres = {
  alRenombrar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// Distingue los ids del «⋯» de cada fila.
export const PREFIJO_DE_NIVEL = 'nivel'

// Las filas de la pantalla: en uso (el fijo primero) y retiradas, cada una con las líneas de su «⋯» y qué abre un clic. Quien sólo lee ve las
// filas sin «⋯» ni clic. Retirar y restaurar cambian la fila de grupo: el foco vuelve al «⋯» que ahora la dibuja.
export function useFilasDeNiveles(
  lista: ListaDeNiveles,
  niveles: Niveles,
  puedeGestionar: boolean,
  { alRenombrar, alPedirEliminar }: Quehaceres,
) {
  const cambio = niveles.cambio
  useEffect(() => {
    if (cambio) {
      document
        .querySelector<HTMLElement>(`[data-mas-acciones="${PREFIJO_DE_NIVEL}-${cambio.id}-mas"]`)
        ?.focus()
    }
  }, [cambio])

  const filaDe = (nivel: NivelDeAcceso): FilaDeNivel => ({
    nivel,
    acciones: puedeGestionar
      ? menuDeNivel(nivel, {
          alRenombrar,
          alRetirar: (uno) => void niveles.retirar(uno),
          alRestaurar: (uno) => void niveles.restaurar(uno),
          alPedirEliminar,
        })
      : [],
    alAbrir:
      puedeGestionar && nivel.seRenombra
        ? () => {
            alRenombrar(nivel.id)
          }
        : null,
  })
  const { fijos, vivos, retirados } = separarNiveles(lista.niveles)
  const enUso = [...fijos, ...vivos].map(filaDe)
  const retiradas = retirados.map(filaDe)
  return {
    enUso,
    retiradas,
    conAcciones: [...enUso, ...retiradas].some((fila) => fila.acciones.length > 0),
  }
}
