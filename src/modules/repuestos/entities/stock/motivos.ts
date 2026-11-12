// Los motivos de un movimiento de stock de repuestos (8.10-1, C7). Puro. Son los mismos textos que valida la base (`repuesto_stock_mover` y
// `repuesto_stock_reasignar`): `sobrante` entra; `vendido`, `devuelto`, `ajuste` y `reasignado` salen. No es un dato de la empresa (no hay tabla de
// motivos): es una regla del stock, como el sentido de cada uno.

export const MOTIVOS_DE_STOCK = ['sobrante', 'vendido', 'devuelto', 'ajuste', 'reasignado'] as const
export type MotivoDeStock = (typeof MOTIVOS_DE_STOCK)[number]
export type SentidoDeStock = 'entrada' | 'salida'

const SENTIDO: Record<MotivoDeStock, SentidoDeStock> = {
  sobrante: 'entrada',
  vendido: 'salida',
  devuelto: 'salida',
  ajuste: 'salida',
  reasignado: 'salida',
}

/** Lo que dice la interfaz de cada motivo (botón o historial). */
export const TEXTO_DEL_MOTIVO: Record<MotivoDeStock, string> = {
  sobrante: 'Pasar a stock',
  vendido: 'Vender suelto',
  devuelto: 'Devolver al proveedor',
  ajuste: 'Ajuste',
  reasignado: 'Reasignado',
}

/** Los que acepta `repuesto_stock_mover` (reasignar tiene su RPC). */
export const MOTIVOS_POR_MOVER = ['sobrante', 'vendido', 'devuelto', 'ajuste'] as const
export type MotivoPorMover = (typeof MOTIVOS_POR_MOVER)[number]

/** Las salidas con botón en la vista «Stock»; `ajuste` no se ofrece (D6 de 8.10-1). */
export const MOTIVOS_CON_BOTON = [
  'vendido',
  'devuelto',
] as const satisfies readonly MotivoPorMover[]

export function sentidoDe(motivo: MotivoDeStock): SentidoDeStock {
  return SENTIDO[motivo]
}

export function esMotivoDeStock(texto: string): texto is MotivoDeStock {
  return (MOTIVOS_DE_STOCK as readonly string[]).includes(texto)
}

export function esMotivoPorMover(texto: string): texto is MotivoPorMover {
  return (MOTIVOS_POR_MOVER as readonly string[]).includes(texto)
}
