'use client'

import { accionesDelPago } from '../../../entities/dinero/acciones-del-pago'
import type { Pago } from '../../../entities/dinero/pago'
import { FilaDePago } from './fila-de-pago'

type Props = {
  pagos: readonly Pago[]
  // «Pagos de la unidad» o «Pagos del proyecto» (8.13-5).
  etiqueta: string
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean; puedeAnular?: boolean }
  alEditar: (id: string) => void
  alEliminar: (id: string) => void
  alConfirmar: (id: string) => void
  alAnular: (id: string) => void
}

// Los pagos de la unidad, de los más recientes a los más viejos. Sin ninguna suma: lo cobrado es la «Venta» del margen (la base la da). Una columna `minmax(0, 1fr)`: con el texto al 200 %
// nada ensancha el panel.
export function ListaDePagos({
  pagos,
  etiqueta,
  permisos,
  alEditar,
  alEliminar,
  alConfirmar,
  alAnular,
}: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label={etiqueta}>
      {pagos.map((pago) => (
        <FilaDePago
          key={pago.id}
          pago={pago}
          acciones={accionesDelPago(pago, permisos)}
          alEditar={() => {
            alEditar(pago.id)
          }}
          alEliminar={() => {
            alEliminar(pago.id)
          }}
          alConfirmar={() => {
            alConfirmar(pago.id)
          }}
          alAnular={() => {
            alAnular(pago.id)
          }}
        />
      ))}
    </ul>
  )
}
