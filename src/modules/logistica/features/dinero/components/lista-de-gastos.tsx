'use client'

import type { Gasto } from '../../../entities/dinero/gasto'
import { FilaDeGasto } from './fila-de-gasto'

type Props = {
  gastos: readonly Gasto[]
  puedeEditar: boolean
  alEditar: (id: string) => void
  alEliminar: (id: string) => void
}

// Los gastos de la unidad, de los más recientes a los más viejos. Sin ninguna suma: el total de la unidad es el «Real» del margen (la base lo da).
// Una columna `minmax(0, 1fr)`: con el texto al 200 % nada ensancha el panel.
export function ListaDeGastos({ gastos, puedeEditar, alEditar, alEliminar }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Gastos de la unidad">
      {gastos.map((gasto) => (
        <FilaDeGasto
          key={gasto.id}
          gasto={gasto}
          alEditar={
            puedeEditar
              ? () => {
                  alEditar(gasto.id)
                }
              : null
          }
          alEliminar={
            puedeEditar
              ? () => {
                  alEliminar(gasto.id)
                }
              : null
          }
        />
      ))}
    </ul>
  )
}
