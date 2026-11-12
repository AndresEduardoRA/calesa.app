import { z } from 'zod'

// Un tipo de cambio de la empresa (6.11-1). Sirve en los dos sentidos (D20 de 6.10-1): moneda → base multiplica y base → moneda divide. Cuál convierte un gasto lo elige
// quien carga entre los activos que unen su moneda con la base (D1); la base guarda el valor de ese momento.
const esquemaDeTipo = z.object({
  id: z.guid(),
  nombre: z.string(),
  moneda_de: z.string(),
  moneda_a: z.string(),
  valor: z.number(),
  es_default: z.boolean(),
  activo: z.boolean(),
  orden: z.number(),
})

export type TipoDeCambio = {
  id: string
  nombre: string
  monedaDe: string
  monedaA: string
  valor: number
  esDefault: boolean
  activo: boolean
  orden: number
}

/** Las filas de `tipos_cambio` como tipos; nula si alguna no tiene la forma esperada. */
export function tiposDeCambioDesde(datos: unknown): TipoDeCambio[] | null {
  const leido = z.array(esquemaDeTipo).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    monedaDe: t.moneda_de,
    monedaA: t.moneda_a,
    valor: t.valor,
    esDefault: t.es_default,
    activo: t.activo,
    orden: t.orden,
  }))
}

/**
 * Los que puede elegir quien carga un gasto en `moneda`: activos y que unen esa moneda con la base en cualquiera de los dos sentidos; el predeterminado primero y
 * el resto por `orden`. Con la moneda base no hay tipo de cambio (la base lo rechaza, D4): vacío.
 */
export function opcionesDeTipoDeCambio(
  tipos: readonly TipoDeCambio[],
  moneda: string,
  monedaBase: string,
): TipoDeCambio[] {
  if (moneda === monedaBase) {
    return []
  }
  return tipos
    .filter(
      (t) =>
        t.activo &&
        ((t.monedaDe === moneda && t.monedaA === monedaBase) ||
          (t.monedaDe === monedaBase && t.monedaA === moneda)),
    )
    .sort(
      (a, b) =>
        Number(b.esDefault) - Number(a.esDefault) ||
        a.orden - b.orden ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
}
