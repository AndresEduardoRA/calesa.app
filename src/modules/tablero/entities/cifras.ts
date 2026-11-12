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
