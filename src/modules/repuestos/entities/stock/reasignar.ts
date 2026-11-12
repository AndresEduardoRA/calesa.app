// La respuesta de `repuesto_stock_reasignar` (8.10-3, C1). Puro. La RPC descuenta del origen y crea el ítem en el destino en una sola transacción, y devuelve los dos;
// la vuelta idempotente (mismo `p_id`) responde igual, así un reintento no crea otro ítem.
import { z } from 'zod'

export type RespuestaDeReasignar = {
  // El ítem nuevo en el proyecto destino.
  id: string
  proyectoId: string
  faseId: string | null
  // El ítem de origen tras descontar.
  origen: {
    itemId: string
    stockCantidad: number
    enStockDesde: string | null
    actualizadoEn: string
  }
}

const esquemaDeRespuesta = z.object({
  id: z.guid(),
  proyecto_id: z.guid(),
  fase_id: z.guid().nullable(),
  origen: z.object({
    item_id: z.guid(),
    stock_cantidad: z.number().int().min(0),
    en_stock_desde: z.string().nullable(),
    actualizado_en: z.string(),
  }),
})

/** Lo que devolvió la RPC; nulo si no tiene la forma esperada. */
export function respuestaDeReasignarDesde(dato: unknown): RespuestaDeReasignar | null {
  const leido = esquemaDeRespuesta.safeParse(dato)
  if (!leido.success) return null
  const r = leido.data
  return {
    id: r.id,
    proyectoId: r.proyecto_id,
    faseId: r.fase_id,
    origen: {
      itemId: r.origen.item_id,
      stockCantidad: r.origen.stock_cantidad,
      enStockDesde: r.origen.en_stock_desde,
      actualizadoEn: r.origen.actualizado_en,
    },
  }
}
