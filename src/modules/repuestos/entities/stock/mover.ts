// La respuesta de `repuesto_stock_mover` y la fila de la hoja tras moverlo (8.10-2, C3). Puro. La RPC devuelve el ítem tras el cambio (con el `actualizado_en` que puso
// su trigger): la hoja lo aplica sobre su fila vigente sin releerla, así la celda siguiente no choca con `PT409` (D3).
import { z } from 'zod'
import type { FilaDeItem } from '../nucleo/item'

export type RespuestaDeMover = {
  itemId: string
  stockCantidad: number
  // ISO, o nulo si el stock quedó en 0.
  enStockDesde: string | null
  actualizadoEn: string
  movimientoId: number
}

const esquemaDeRespuesta = z.object({
  item_id: z.guid(),
  stock_cantidad: z.number().int().min(0),
  en_stock_desde: z.string().nullable(),
  actualizado_en: z.string(),
  movimiento_id: z.number().int(),
})

/** Lo que devolvió la RPC; nulo si no tiene la forma esperada. */
export function respuestaDeMoverDesde(dato: unknown): RespuestaDeMover | null {
  const leido = esquemaDeRespuesta.safeParse(dato)
  if (!leido.success) return null
  const r = leido.data
  return {
    itemId: r.item_id,
    stockCantidad: r.stock_cantidad,
    enStockDesde: r.en_stock_desde,
    actualizadoEn: r.actualizado_en,
    movimientoId: r.movimiento_id,
  }
}

/** La fila con el stock y la versión que devolvió la base; el resto, como estaba. */
export function filaTrasMover(fila: FilaDeItem, r: RespuestaDeMover): FilaDeItem {
  return {
    ...fila,
    stockCantidad: r.stockCantidad,
    enStock: r.enStockDesde !== null,
    actualizadoEn: r.actualizadoEn,
  }
}
