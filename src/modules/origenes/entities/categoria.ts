// Categorías dentro de un origen (marcas, segmentos, «medio uso»). Un solo nivel de anidado.
import { z } from 'zod'

export type Categoria = {
  id: string
  origenId: string
  padreId: string | null
  nombre: string
  orden: number
  activa: boolean
  actualizadoEn: string
  // Cuántos vehículos la tienen (papelera incluida). null si quien mira no puede contarlos.
  vehiculos: number | null
}

const esquemaCategorias = z.array(
  z.object({
    id: z.guid(),
    origen_id: z.guid(),
    padre_id: z.guid().nullable(),
    nombre: z.string(),
    orden: z.number(),
    activa: z.boolean(),
    actualizado_en: z.string(),
  }),
)

const esquemaUsos = z.array(z.object({ categoria_id: z.guid(), vehiculos: z.number() }))

// `usos` null = quien lee no puede contar: la lista no inventa ceros.
export function categoriasDesde(filas: unknown, usos: unknown | null): Categoria[] {
  const porCategoria =
    usos === null
      ? null
      : new Map(esquemaUsos.parse(usos).map((u) => [u.categoria_id, u.vehiculos]))
  return esquemaCategorias
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      origenId: fila.origen_id,
      padreId: fila.padre_id,
      nombre: fila.nombre,
      orden: fila.orden,
      activa: fila.activa,
      actualizadoEn: fila.actualizado_en,
      vehiculos: porCategoria === null ? null : (porCategoria.get(fila.id) ?? 0),
    }))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

export type NodoDeCategoria = { categoria: Categoria; hijas: Categoria[] }

// Las raíces en su orden y, debajo de cada una, sus hijas. Una hija cuyo padre no está (no debería
// pasar: la base lo impide) se muestra como raíz en vez de perderse.
export function arbolDeCategorias(categorias: readonly Categoria[]): NodoDeCategoria[] {
  const ids = new Set(categorias.map((categoria) => categoria.id))
  const esRaiz = (categoria: Categoria) => categoria.padreId === null || !ids.has(categoria.padreId)
  return categorias.filter(esRaiz).map((categoria) => ({
    categoria,
    hijas: categorias.filter((otra) => otra.padreId === categoria.id),
  }))
}

// «Después de X» (null = primera) para subir o bajar una categoría entre sus hermanas, o null
// en los extremos.
export function destinoDeMoverCategoria(
  hermanas: readonly Categoria[],
  id: string,
  sentido: 'subir' | 'bajar',
): { despuesDe: string | null } | null {
  const posicion = hermanas.findIndex((otra) => otra.id === id)
  if (posicion < 0) {
    return null
  }
  if (sentido === 'bajar') {
    const siguiente = hermanas[posicion + 1]
    return siguiente ? { despuesDe: siguiente.id } : null
  }
  if (posicion === 0) {
    return null
  }
  return { despuesDe: hermanas[posicion - 2]?.id ?? null }
}

// Por qué una categoría no se elimina, o null si se puede.
export function motivoParaNoEliminarCategoria(
  categoria: Categoria,
  hijas: readonly Categoria[],
): string | null {
  if (hijas.length > 0) {
    return `«${categoria.nombre}» tiene subcategorías: elimínalas primero.`
  }
  if (categoria.vehiculos !== null && categoria.vehiculos > 0) {
    return `${categoria.vehiculos === 1 ? '1 vehículo está' : `${categoria.vehiculos} vehículos están`} en «${categoria.nombre}». Desactívala para conservarlos agrupados.`
  }
  return null
}
