// Las reglas del sobrante de repuestos (8.10-1, C8). Puro: espejo de `repuesto_stock_mover` y `repuesto_stock_reasignar` para decir el motivo antes de
// enviar. Los textos son los de la base; la que decide es la base (bajo su candado): esto sólo evita un viaje que ya se sabe que vuelve rechazado.
import { esMotivoPorMover, sentidoDe, type MotivoDeStock } from './motivos'

export const MENSAJE_DE_CANTIDAD_DE_STOCK = 'La cantidad es un número entero desde 1.'
export const MENSAJE_DE_MOTIVO_INEXISTENTE = 'Ese motivo no existe.'
export const MENSAJE_DE_REASIGNAR_POR_MOVER = 'Para reasignar usa «Reasignar a un proyecto».'
export const MENSAJE_DE_TODO_EN_STOCK = 'Este ítem ya pasó todo a stock.'
export const MENSAJE_DE_MISMO_PROYECTO = 'Elige otro proyecto: el ítem ya es de este.'
export const MENSAJE_DE_DESTINO_CERRADO =
  'El proyecto destino está cerrado: reábrelo para sumar ítems.'
export const MAXIMO_DE_NOTA_DE_STOCK = 500
export const MENSAJE_DE_NOTA_LARGA = 'La nota admite hasta 500 caracteres.'

export const soloPuedesPasar = (n: number) => `Sólo puedes pasar ${n} más de este ítem a stock.`
export const soloHayEnStock = (n: number) => `Sólo hay ${n} en stock.`

export type CampoDeStock = 'motivo' | 'cantidad' | 'nota' | 'proyecto'
export type RechazoDeStock = { ok: false; campo: CampoDeStock; error: string }

/** Cuánto puede entrar todavía por `sobrante`: la cantidad del ítem menos lo que ya entró (nunca menos de 0). */
export function disponibleParaStock(cantidad: number, entradasSobrante: number): number {
  return Math.max(cantidad - entradasSobrante, 0)
}

const esCantidad = (n: number) => Number.isInteger(n) && n >= 1

/** Una nota en blanco se guarda nula; recortada, hasta 500 caracteres. */
export function validarNotaDeStock(nota: string | null | undefined): RechazoDeStock | null {
  const limpia = (nota ?? '').trim()
  return limpia.length > MAXIMO_DE_NOTA_DE_STOCK
    ? { ok: false, campo: 'nota', error: MENSAJE_DE_NOTA_LARGA }
    : null
}

export type Movimiento = {
  motivo: MotivoDeStock
  cantidad: number
  /** El stock que se vio (el que la base compara). */
  stock: number
  /** Lo que todavía puede entrar por `sobrante` (`disponibleParaStock`). */
  disponible: number
}

export type MovimientoValido = { ok: true; stockTras: number; cantidadConSigno: number }

/** Lo que haría `repuesto_stock_mover`: el stock tras moverlo y la fila con signo, o el motivo del rechazo con su campo. */
export function validarMovimiento(m: Movimiento): MovimientoValido | RechazoDeStock {
  if (m.motivo === 'reasignado') {
    return { ok: false, campo: 'motivo', error: MENSAJE_DE_REASIGNAR_POR_MOVER }
  }
  if (!esMotivoPorMover(m.motivo)) {
    return { ok: false, campo: 'motivo', error: MENSAJE_DE_MOTIVO_INEXISTENTE }
  }
  if (!esCantidad(m.cantidad)) {
    return { ok: false, campo: 'cantidad', error: MENSAJE_DE_CANTIDAD_DE_STOCK }
  }
  if (sentidoDe(m.motivo) === 'entrada') {
    const disponible = Math.max(m.disponible, 0)
    if (disponible === 0) return { ok: false, campo: 'cantidad', error: MENSAJE_DE_TODO_EN_STOCK }
    if (m.cantidad > disponible) {
      return { ok: false, campo: 'cantidad', error: soloPuedesPasar(disponible) }
    }
    return { ok: true, stockTras: m.stock + m.cantidad, cantidadConSigno: m.cantidad }
  }
  if (m.cantidad > m.stock) return { ok: false, campo: 'cantidad', error: soloHayEnStock(m.stock) }
  return { ok: true, stockTras: m.stock - m.cantidad, cantidadConSigno: -m.cantidad }
}

export type Reasignacion = {
  cantidad: number
  stock: number
  mismoProyecto: boolean
  destinoCerrado: boolean
}

/** Lo que haría `repuesto_stock_reasignar` antes de escribir: el stock que queda en el origen, o el motivo del rechazo. */
export function validarReasignacion(
  r: Reasignacion,
): { ok: true; stockTras: number } | RechazoDeStock {
  if (!esCantidad(r.cantidad)) {
    return { ok: false, campo: 'cantidad', error: MENSAJE_DE_CANTIDAD_DE_STOCK }
  }
  if (r.mismoProyecto) return { ok: false, campo: 'proyecto', error: MENSAJE_DE_MISMO_PROYECTO }
  if (r.destinoCerrado) return { ok: false, campo: 'proyecto', error: MENSAJE_DE_DESTINO_CERRADO }
  if (r.cantidad > r.stock) return { ok: false, campo: 'cantidad', error: soloHayEnStock(r.stock) }
  return { ok: true, stockTras: r.stock - r.cantidad }
}

/** `en_stock_desde` tras un movimiento: se conserva (o se fija ahora) mientras quede algo y se limpia al llegar a 0. */
export function enStockTras(
  stockTras: number,
  enStockDesde: string | null,
  ahora: string,
): string | null {
  return stockTras > 0 ? (enStockDesde ?? ahora) : null
}
