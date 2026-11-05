import type { CotizacionDelListado } from '../../../entities/filas-del-listado'

export type FilaDeCotizacion = CotizacionDelListado

// Un origen con el que se nombra a una fila (los de `cotizaciones.ver` de quien mira).
export type OrigenDelListado = { id: string; nombre: string }

// El nombre de una fila que no se ve (o no tiene) se dibuja «—», sin distinguir un caso del otro.
export const SIN_NOMBRE = '—'

export function nombreDelOrigen(origenes: readonly OrigenDelListado[], id: string): string {
  return origenes.find((origen) => origen.id === id)?.nombre ?? SIN_NOMBRE
}
