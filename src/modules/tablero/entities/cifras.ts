// Cómo se escribe una cifra del tablero. Cero I/O.
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import type { EstadoDelTurno } from './metricas'

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

// La mediana hasta «Contacté», en minutos con un decimal. Nula (nadie contactó en el período) es «Sin datos».
export function textoDeMinutos(minutos: number | null): string {
  return minutos === null ? TEXTO_SIN_DATOS : `${formatearNumero(minutos, { decimales: 1 })} min`
}

// La cuenta de turnos web por estado: un `Record` sobre las claves de la RPC, así el compilador pide las cinco.
export const NOMBRES_DE_ESTADO_DEL_TURNO: Record<EstadoDelTurno, string> = {
  asignada: 'Asignados',
  contactada: 'Contactados',
  vencida: 'Vencidos',
  sin_asignar: 'Sin asignar',
  cancelada: 'Cancelados',
}
