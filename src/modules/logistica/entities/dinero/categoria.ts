import { z } from 'zod'

// Una categoría de gasto (6.11-1): sale de la base (`categorias_gasto`), ningún texto fijo la nombra. `proposito` es de la lista fija de la base (tributos, flete…).
const esquemaDeCategoria = z.object({
  id: z.guid(),
  nombre: z.string(),
  proposito: z.string().nullable(),
  activo: z.boolean(),
  orden: z.number(),
})

export type CategoriaDeGasto = {
  id: string
  nombre: string
  proposito: string | null
  activo: boolean
  orden: number
}

/** Las filas de `categorias_gasto`; nulo si alguna no tiene la forma esperada. */
export function categoriasDesde(datos: unknown): CategoriaDeGasto[] | null {
  const leido = z.array(esquemaDeCategoria).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Las que se ofrecen al cargar o corregir un gasto: las activas y, si se corrige uno viejo, la suya aunque se haya desactivado. */
export function categoriasParaElegir(
  categorias: readonly CategoriaDeGasto[],
  actualId: string | null,
): CategoriaDeGasto[] {
  return categorias
    .filter((c) => c.activo || c.id === actualId)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}
