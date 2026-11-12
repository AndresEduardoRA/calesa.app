// Cómo se escribe una cifra del tablero. Cero I/O.
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'

export const TEXTO_SIN_DATOS = 'Sin datos'

// Una tasa nula (no hubo leads en el período) es «Sin datos», nunca «0 %»: cero con leads sí es un dato.
export function textoDeTasa(tasa: number | null): string {
  return tasa === null ? TEXTO_SIN_DATOS : formatearPorcentaje(tasa)
}

export function textoDeConteo(cantidad: number): string {
  return formatearNumero(cantidad)
}

// El margen sin vehículos en el período: no es 0, es que no hubo venta (el mismo texto que el panel de la unidad).
export const TEXTO_SIN_VENTA = 'Sin venta registrada'

function vehiculos(cantidad: number): string {
  return cantidad === 1 ? '1 vehículo' : `${formatearNumero(cantidad)} vehículos`
}

// Los vehículos con pagos del período y ninguno confirmado: se cuentan aparte y no suman al margen. Sin ninguno, nada.
export function textoDeSinVenta(cantidad: number): string | null {
  return cantidad === 0 ? null : `${vehiculos(cantidad)} sin venta registrada`
}

// Un vehículo cuenta en el período de su último pago confirmado: un mes pasado puede cambiar, así que nada lo presenta como cerrado.
export function textoDeVehiculosDelMargen(cantidad: number): string {
  return `${vehiculos(cantidad)} por su último pago confirmado`
}
