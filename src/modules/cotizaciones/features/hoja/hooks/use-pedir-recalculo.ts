'use client'

import { useCallback } from 'react'
import { entradasDelPedido, type Entradas } from '../../../entities/entradas'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { recalcular } from '../../../composicion.client'

// El pedido del recálculo de la hoja, estable: el hook del recálculo lo lee una vez. Lleva el modo de tipo de cambio que eligió quien cotiza. La hoja se vuelve a montar si cambia
// la fórmula o el vehículo (la `key` de la pantalla).
export function usePedirRecalculo(origenId: string, vehiculoId: string | null, abierta: string) {
  return useCallback(
    (e: Entradas) => {
      const pedido: PedidoDeRecalculo = {
        origenId,
        vehiculoId,
        abierta,
        entradas: entradasDelPedido(e),
        modoTc: e.modoTc,
      }
      return recalcular(pedido)
    },
    [origenId, vehiculoId, abierta],
  )
}
