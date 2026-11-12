// Mover el stock de un ítem, dicho como interfaz (8.10-2, C5). La implementación (Supabase) vive en `infra/stock/` y se la entrega `areas/stock/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { MotivoPorMover } from './motivos'
import type { RespuestaDeMover } from './mover'

export type PedidoDeMover = {
  itemId: string
  motivo: MotivoPorMover
  unidades: number
  // El stock que se vio: si cambió, la base responde `PT409`.
  stockEsperado: number
  nota: string | null
}

export type RepositorioDeStock = {
  // `repuesto_stock_mover`: bajo el candado del ítem, nunca negativo. Un rechazo trae su campo (`rechazoDeStock`).
  mover: (pedido: PedidoDeMover) => Promise<ResultadoDeAccion<RespuestaDeMover>>
}
