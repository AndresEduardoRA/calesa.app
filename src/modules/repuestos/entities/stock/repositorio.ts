// Mover el stock de un ítem y leer sus movimientos, dicho como interfaz (8.10-2, C5). La implementación (Supabase) vive en `infra/stock/` y se la entrega `areas/stock/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { MotivoPorMover } from './motivos'
import type { PaginaDeMovimientos } from './movimientos'
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
  // Los movimientos del ítem del más nuevo al más viejo, de a una página; con `cursor`, los anteriores a ese id. La RLS decide qué se ve.
  movimientos: (pedido: {
    itemId: string
    cursor: number | null
  }) => Promise<Resultado<PaginaDeMovimientos>>
}
