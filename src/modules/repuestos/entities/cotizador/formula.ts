// La fórmula del cotizador de repuestos (8.12-1, C1–C3, C5). Pura y exacta: enteros a escala fija, nunca `float`.
// La base corre la misma (`_repuesto_cotizacion_linea`) y decide; los dos lados prueban los mismos casos (`casos-del-cotizador.json`).
//   importado (por unidad) = costo × factor_importado + logística + caja
//   local (por unidad)     = (costo + logística + caja) × (1 + recargo_local)
// El unitario se redondea al múltiplo más cercano de `redondeo` (la mitad hacia arriba) y el total es unitario × cantidad.
// La logística es la escrita o, si es nula, la sugerida: el monto del tramo con costo_min ≤ costo < costo_max. **Sin tramo, sin sugerencia**
// (nunca 0) y la línea queda sin total hasta que se escriba. Un 0 explícito es un valor.
import { aEscala, aTexto, potencia } from './decimal'
import type { SnapshotDelCotizador, TramoDeLogistica } from './snapshot'

/** Líneas como mucho por cotización (la base devuelve 22023 con más). */
export const TOPE_DE_LINEAS = 200

/** Un total desde 10^16 no cabe en numeric(18,2). */
const TOPE_DEL_TOTAL = potencia(16) * 100n

export type BloqueDeCotizacion = 'importado' | 'local'
export type FaltaDeLaLinea = 'costo' | 'logistica' | 'caja' | 'no_cabe'

export type EntradaDeLinea = {
  bloque: BloqueDeCotizacion
  cantidad: number
  costo: string | null
  logistica: string | null
  caja: string | null
}

export type LineaCalculada = {
  logisticaSugerida: string | null
  unitario: string | null
  total: string | null
  falta: FaltaDeLaLinea | null
}

function monto(texto: string | null): bigint | null {
  return texto === null ? null : aEscala(texto, 2)
}

/** El monto del tramo que contiene el costo, o `null` si ninguno lo contiene (o no hay costo). */
export function sugerirLogistica(
  tramos: readonly TramoDeLogistica[],
  costo: string | null,
): string | null {
  const c = monto(costo)
  if (c === null) return null
  for (const t of tramos) {
    const min = aEscala(t.costo_min, 2)
    const max = t.costo_max === null ? null : aEscala(t.costo_max, 2)
    const valor = aEscala(t.monto, 2)
    if (min === null || valor === null) continue
    if (c >= min && (max === null || c < max)) return aTexto(valor, 2)
  }
  return null
}

/** La línea con su logística sugerida, su unitario redondeado y su total, o lo que le falta para tenerlo. */
export function calcularLinea(
  snapshot: SnapshotDelCotizador,
  linea: EntradaDeLinea,
): LineaCalculada {
  const logisticaSugerida = sugerirLogistica(snapshot.tramos, linea.costo)
  const sinTotal = (falta: FaltaDeLaLinea): LineaCalculada => ({
    logisticaSugerida,
    unitario: null,
    total: null,
    falta,
  })

  const costo = monto(linea.costo)
  if (costo === null) return sinTotal('costo')
  const logistica = monto(linea.logistica ?? logisticaSugerida)
  if (logistica === null) return sinTotal('logistica')
  const caja = monto(linea.caja)
  if (caja === null) return sinTotal('caja')

  const factor = aEscala(snapshot.config.factor_importado, 4) ?? 0n
  const recargo = aEscala(snapshot.config.recargo_local, 4) ?? 0n
  // A escala 6: costo (2) × factor (4); los montos de escala 2 suben 4.
  const porUnidad =
    linea.bloque === 'importado'
      ? costo * factor + (logistica + caja) * potencia(4)
      : (costo + logistica + caja) * (potencia(4) + recargo)

  // Un redondeo ≤ 0 (filas viejas sin el check) vale 0,01.
  const redondeo = aEscala(snapshot.config.redondeo, 2) ?? 0n
  const r = (redondeo > 0n ? redondeo : 1n) * potencia(4)
  let q = porUnidad / r
  if ((porUnidad - q * r) * 2n >= r) q += 1n
  const unitario = (q * r) / potencia(4)

  const total = unitario * BigInt(linea.cantidad)
  if (total >= TOPE_DEL_TOTAL) return sinTotal('no_cabe')
  return { logisticaSugerida, unitario: aTexto(unitario, 2), total: aTexto(total, 2), falta: null }
}

/** La suma de los totales si hay al menos uno y ninguno es nulo; si no, `null` (nulo no es 0). */
export function totalDeLaCotizacion(totales: readonly (string | null)[]): string | null {
  if (totales.length === 0) return null
  let suma = 0n
  for (const t of totales) {
    const v = monto(t)
    if (v === null) return null
    suma += v
  }
  return aTexto(suma, 2)
}
