// El reparto en partes iguales de un gasto entre las unidades de un grupo (6.11-4). Es la misma aritmética de centavos que `gastos_prorratear` (6.10):
// si cambia la base, cambia esto y su test. Sólo sirve para mostrar la vista previa: el equivalente en la moneda base lo calcula siempre la base.

/** El tope de unidades de un reparto (`gastos_prorratear` rechaza más de 200). */
export const MAXIMO_DE_UNIDADES_POR_REPARTO = 200

/**
 * Las partes de un monto entre `n` unidades, en el orden de las unidades: los centavos que sobran van a las primeras, de a uno.
 * 100,00 entre 3 da 33,34 · 33,33 · 33,33. La suma de las partes es exactamente el monto. Vacío si no hay unidades o el monto no es válido.
 */
export function repartirEnPartesIguales(monto: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(monto) || monto < 0) {
    return []
  }
  const total = Math.round(monto * 100)
  const cada = Math.floor(total / n)
  const sobran = total % n
  return Array.from({ length: n }, (_, i) => (cada + (i < sobran ? 1 : 0)) / 100)
}

export type UnidadDelReparto = { id: string; titulo: string }

export type FilaDelReparto = { unidadId: string; titulo: string; parte: number }

export type VistaDelReparto = { filas: FilaDelReparto[]; suma: number; exceso: boolean }

/** Cuánto le toca a cada unidad, en el orden en que se mandan a la base; con más de 200 no hay filas y `exceso` es verdadero. */
export function vistaDelReparto(
  unidades: readonly UnidadDelReparto[],
  monto: number,
): VistaDelReparto {
  if (unidades.length > MAXIMO_DE_UNIDADES_POR_REPARTO) {
    return { filas: [], suma: 0, exceso: true }
  }
  const partes = repartirEnPartesIguales(monto, unidades.length)
  const filas = unidades.map((u, i) => ({
    unidadId: u.id,
    titulo: u.titulo,
    parte: partes[i] ?? 0,
  }))
  const suma = Math.round(partes.reduce((s, p) => s + Math.round(p * 100), 0)) / 100
  return { filas, suma, exceso: false }
}
