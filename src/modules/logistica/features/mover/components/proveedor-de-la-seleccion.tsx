'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  alternar,
  elegirLaColumna,
  SELECCION_VACIA,
  vaciar,
  type EstadoDeLaSeleccion,
} from '../../../entities/nucleo/seleccion'
import { ContextoDeLaSeleccion, type SeleccionDeLaCadena } from '../../nucleo/seleccion/contexto'

type Props = {
  origenId: string
  // Los filtros de la cadena, dichos como texto: otro filtro es otra lista y lo elegido ya no es lo que se ve.
  firmaDelPedido: string
  children: ReactNode
}

// El proveedor de la selección para mover en lote (6.04-3, D27): vive en memoria (no sobrevive a recargar, D31) y se vacía al cambiar de origen o de filtros. Sólo se monta si quien mira puede
// mover (`flujos.mover` en el origen): sin él la cadena no tiene casillas ni barra.
export function ProveedorDeLaSeleccion({ origenId, firmaDelPedido, children }: Props) {
  const firma = `${origenId}|${firmaDelPedido}`
  const [estado, setEstado] = useState<EstadoDeLaSeleccion>(SELECCION_VACIA)
  const [firmaVista, setFirmaVista] = useState(firma)
  if (firmaVista !== firma) {
    setFirmaVista(firma)
    setEstado(SELECCION_VACIA)
  }
  const valor = useMemo<SeleccionDeLaCadena>(
    () => ({
      estado,
      alternar: (fase, unidad) => {
        setEstado((actual) => alternar(actual, fase, unidad))
      },
      elegirLaColumna: (fase, unidades) => {
        setEstado((actual) => elegirLaColumna(actual, fase, unidades))
      },
      vaciar: () => {
        setEstado(vaciar())
      },
    }),
    [estado],
  )
  return <ContextoDeLaSeleccion value={valor}>{children}</ContextoDeLaSeleccion>
}
