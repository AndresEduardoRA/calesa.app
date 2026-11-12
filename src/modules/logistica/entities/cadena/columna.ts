import { conteoAcotado, conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { ColumnaDeLaCadena, TarjetaDeLaCadena } from './leer'

// Lo puro de una columna de la cadena (6.03-1): su clave, su número, y cuándo se puede pedir más.

/** La clave de una columna en la URL (`?fase=`) y en el DOM: el id de su fase, o `sin_fase` para la columna «Sin fase». */
export const CLAVE_DE_SIN_FASE = 'sin_fase'

export function claveDeColumna(faseId: string | null): string {
  return faseId ?? CLAVE_DE_SIN_FASE
}

/** La columna que pide `?fase=`: la que tiene esa clave; si no (ajena, vacía), la primera; nulo si no hay columnas. */
export function columnaElegida(
  columnas: readonly ColumnaDeLaCadena[],
  parametro: string | null | undefined,
): ColumnaDeLaCadena | null {
  return columnas.find((c) => claveDeColumna(c.faseId) === parametro) ?? columnas[0] ?? null
}

/** El número de la columna: lo cargado, y «+» si hay más. Nunca un total exacto (`.claude/rules/escala.md`). */
export function conteoDeLaColumna(columna: ColumnaDeLaCadena): ConteoAcotado {
  return columna.hayMas
    ? { n: columna.tarjetas.length, hayMas: true }
    : conteoAcotado(columna.tarjetas.length, TOPE_DE_LO_CARGADO)
}

/** «12» o «50+», lo que va en el encabezado. */
export function numeroDeLaColumna(columna: ColumnaDeLaCadena): string {
  return conteoCorto(conteoDeLaColumna(columna))
}

/** ¿Se puede pedir más? Hay más en la base y no se llegó al tope de lo cargado. */
export function puedeVerMas(columna: Pick<ColumnaDeLaCadena, 'hayMas' | 'tarjetas'>): boolean {
  return columna.hayMas && columna.tarjetas.length < TOPE_DE_LO_CARGADO
}

/** ¿Se llegó al tope de lo cargado con más por ver? Entonces se avisa en vez de seguir. */
export function enElTope(columna: Pick<ColumnaDeLaCadena, 'hayMas' | 'tarjetas'>): boolean {
  return columna.hayMas && columna.tarjetas.length >= TOPE_DE_LO_CARGADO
}

/** Suma las tarjetas que llegaron sin repetir las que ya estaban (otra persona pudo moverlas entre dos pedidos) y sin pasar del tope. */
export function agregarTarjetas(
  columna: ColumnaDeLaCadena,
  nuevas: readonly TarjetaDeLaCadena[],
  hayMas: boolean,
): ColumnaDeLaCadena {
  const vistas = new Set(columna.tarjetas.map((t) => t.id))
  const sumadas: TarjetaDeLaCadena[] = []
  for (const tarjeta of nuevas) {
    if (!vistas.has(tarjeta.id)) {
      vistas.add(tarjeta.id)
      sumadas.push(tarjeta)
    }
  }
  const tarjetas = [...columna.tarjetas, ...sumadas].slice(0, TOPE_DE_LO_CARGADO)
  return { ...columna, tarjetas, hayMas }
}

export type CursorDeLaColumna = { desde: string | null; id: string }

/**
 * El cursor del siguiente pedido: la última tarjeta cargada. En una fase es `(fase_desde, id)` y la base exige los dos; «Sin fase» no tiene `fase_desde` (la restricción
 * `vehiculos_fase_desde_coherente`) y va sólo por `id`. Nulo si no hay tarjetas o a la última de una fase le falta la fecha.
 */
export function cursorDeLaColumna(
  columna: Pick<ColumnaDeLaCadena, 'faseId' | 'tarjetas'>,
): CursorDeLaColumna | null {
  const ultima = columna.tarjetas.at(-1)
  if (!ultima) return null
  if (columna.faseId === null) return { desde: null, id: ultima.id }
  return ultima.faseDesde ? { desde: ultima.faseDesde, id: ultima.id } : null
}
