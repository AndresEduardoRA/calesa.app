// Leer las tablas de referencia para editarlas (4.23-2): los tipos, los topes y lo puro de las dos lecturas de `infra/tablas/lectura.ts`. Una tabla se lee **entera o
// nada**: `tabla_referencia_publicar()` reemplaza todas las filas por las que recibe, así que publicar una tabla leída a medias borraría las que faltaron.
import { z } from 'zod'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { esquemaDeValorDeCelda } from './edicion'

// Las tablas de un origen y las compartidas: decenas por empresa (configuración, `.claude/rules/escala.md`), con tope.
export const TOPE_DE_TABLAS = 100
// Lo que se pide por pedido de filas: el `max_rows` de PostgREST en `supabase/config.toml` (propio del área: el del área `formula` no se importa).
export const FILAS_POR_PEDIDO = 1000

export type TablaDeReferencia = {
  id: string
  origenId: string | null
  clave: string
  nombre: string
  descripcion: string | null
  columnas: ColumnaDeTabla[]
  // La versión que «Publicar» manda como esperada (PT409 si otro publicó después).
  version: number
  nota: string | null
  publicadoEn: string | null
  // El nombre de quien la publicó por última vez.
  publicadoPor: string | null
  // Sin origen: la usan todos los orígenes que no tienen una propia con su clave.
  compartida: boolean
  // Una compartida que el origen tapa con una propia de su clave: publicarla no le cambia nada a ese origen, sí a los demás.
  tapada: boolean
}

export const SIN_LEER_LAS_TABLAS = 'No pudimos leer las tablas de referencia.'
export const SIN_LEER_LAS_FILAS = 'No pudimos leer las filas de la tabla.'
export const TABLA_NO_ENCONTRADA = 'No encontramos esa tabla de referencia.'
export const TABLA_DEMASIADO_GRANDE = 'Esta tabla tiene más de 2.000 filas: no se edita desde aquí.'

// Una fila de `tablas_referencia` con el autor embebido (`perfiles!tablas_referencia_publicado_por_fkey`).
export const esquemaDeTablaDeLaBase = z.object({
  id: z.guid(),
  origen_id: z.guid().nullable(),
  clave: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  columnas: z.unknown(),
  version: z.int().min(1),
  nota: z.string().nullable(),
  publicado_en: z.string().nullable(),
  autor: z.object({ nombre: z.string() }).nullable(),
})

// Una fila de `tablas_referencia_filas`: `valores` tiene que ser un objeto de celdas que se editan; si no, la lectura entera falla (nunca se edita una tabla a la que le falta una fila).
export const esquemaDeFilaDeLaBase = z.object({
  id: z.guid(),
  orden: z.int(),
  valores: z.record(z.string(), esquemaDeValorDeCelda),
})

// Las compartidas que el origen tapa con una propia activa de su clave.
export function marcarTapadas(
  tablas: readonly Omit<TablaDeReferencia, 'tapada'>[],
): TablaDeReferencia[] {
  const propias = new Set(tablas.filter((t) => !t.compartida).map((t) => t.clave))
  return tablas.map((t) => ({ ...t, tapada: t.compartida && propias.has(t.clave) }))
}

// El filtro del pedido siguiente: las filas después de la última leída en `(orden, id)` (`tablas_referencia_filas_tabla_orden_idx`).
export function filtroDeCursor(ultima: { orden: number; id: string }): string {
  const o = String(ultima.orden)
  return `orden.gt.${o},and(orden.eq.${o},id.gt.${ultima.id})`
}
