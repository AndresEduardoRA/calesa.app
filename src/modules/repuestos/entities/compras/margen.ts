// El margen de un proyecto de repuestos (8.11-1, C12): la lectura de lo que devuelve `repuestos_proyecto_margen` y su texto. Puro.
// La cuenta la hace la base (por moneda: Σ cantidad × precio de los ítems vivos − Σ compras vivas); acá no hay aritmética de dinero.
// **Nulo no es 0:** con algún ítem sin precio el margen no se sabe, y un margen que da 0 es 0.
import { z } from 'zod'

import { conteoAcotado, conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'

// Espejo del `limit 201` de la RPC: 201 quiere decir «más de 200».
export const TOPE_SIN_PRECIO = 200

export type MargenEnMoneda = {
  moneda: string
  precios: number
  compras: number
  // Nulo si algún ítem vivo del proyecto no tiene precio (o lo tiene sin moneda).
  margen: number | null
}

export type MargenDelProyecto = {
  sinPrecio: ConteoAcotado
  monedas: MargenEnMoneda[]
}

export const esquemaDelMargen = z.object({
  sin_precio: z
    .number()
    .int()
    .min(0)
    .max(TOPE_SIN_PRECIO + 1),
  monedas: z.array(
    z.object({
      moneda: z.string().min(1),
      precios: z.number(),
      compras: z.number(),
      margen: z.number().nullable(),
    }),
  ),
})

export type LecturaDelMargen = { ok: true; datos: MargenDelProyecto } | { ok: false; error: string }

/** Lo que devolvió la RPC, o un error si no tiene la forma esperada. */
export function leerMargen(dato: unknown): LecturaDelMargen {
  const leido = esquemaDelMargen.safeParse(dato)
  if (!leido.success) {
    return { ok: false, error: 'No se pudo leer el margen del proyecto.' }
  }
  const sinPrecio = conteoAcotado(leido.data.sin_precio, TOPE_SIN_PRECIO)
  return {
    ok: true,
    datos: {
      sinPrecio,
      // Defensa en profundidad: con ítems sin precio el margen no se sabe, aunque llegue un número.
      monedas: leido.data.monedas.map((m) => ({
        moneda: m.moneda,
        precios: m.precios,
        compras: m.compras,
        margen: sinPrecio.n > 0 ? null : m.margen,
      })),
    },
  }
}

/** «Sin precio en 1 ítem», «Sin precio en 3 ítems» o «Sin precio en más de 200 ítems». */
export function textoSinPrecio(conteo: ConteoAcotado): string {
  if (!conteo.hayMas && conteo.n === 1) return 'Sin precio en 1 ítem'
  return `Sin precio en ${conteoEnFrase(conteo)} ítems`
}
