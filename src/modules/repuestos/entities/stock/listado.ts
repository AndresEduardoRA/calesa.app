// La vista «Stock» de `/repuestos` (8.10-1, C9): la fila que devuelve `repuestos_stock_listar` y su cursor `(en_stock_desde, id)`. Puro. El cursor
// viaja como el de toda lista (`codificarCursor` de `shared`, sólo «siguiente»: la base camina hacia adelante y no hay «Anterior»).
import { z } from 'zod'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { codificarCursor, leerCursor } from '@/shared/lib/paginacion'

export const NOMBRE_DEL_CURSOR_DE_STOCK = CLAVE_DE_CURSOR

const instante = z.iso.datetime({ offset: true })

const FILA_DE_LA_BASE = z.object({
  id: z.guid(),
  descripcion: z.string(),
  stock_cantidad: z.number().int().min(1),
  en_stock_desde: instante,
  proyecto_id: z.guid(),
  proyecto_numero: z.number().int(),
  proyecto_cerrado_en: instante.nullable(),
  vehiculo_id: z.guid().nullable(),
  vehiculo_titulo: z.string().nullable(),
  vehiculo_etiqueta: z.string().nullable(),
})

export type FilaDeStock = {
  id: string
  descripcion: string
  stockCantidad: number
  enStockDesde: string
  proyectoId: string
  proyectoNumero: number
  proyectoCerradoEn: string | null
  vehiculoId: string | null
  vehiculoTitulo: string | null
  vehiculoEtiqueta: string | null
}

export type PaginaDeStock = { filas: FilaDeStock[]; siguiente: string | null }

/** Una fila de `repuestos_stock_listar`; nula si no tiene la forma esperada. */
export function filaDeStockDesde(fila: unknown): FilaDeStock | null {
  const r = FILA_DE_LA_BASE.safeParse(fila)
  if (!r.success) return null
  const f = r.data
  return {
    id: f.id,
    descripcion: f.descripcion,
    stockCantidad: f.stock_cantidad,
    enStockDesde: f.en_stock_desde,
    proyectoId: f.proyecto_id,
    proyectoNumero: f.proyecto_numero,
    proyectoCerradoEn: f.proyecto_cerrado_en,
    vehiculoId: f.vehiculo_id,
    vehiculoTitulo: f.vehiculo_titulo,
    vehiculoEtiqueta: f.vehiculo_etiqueta,
  }
}

export function cursorDeStock(fila: Pick<FilaDeStock, 'id' | 'enStockDesde'>): string {
  return codificarCursor({ instante: fila.enStockDesde, id: fila.id, sentido: 'siguiente' })
}

/** `?cursor=` → `{ en, id }` para `p_cursor_en` y `p_cursor_id`; nulo (la primera página) si falta, está mal formado o es de «anterior». */
export function leerCursorDeStock(
  texto: string | null | undefined,
): { en: string; id: string } | null {
  const cursor = leerCursor(texto)
  if (cursor === null || cursor.sentido !== 'siguiente') return null
  return { en: cursor.instante, id: cursor.id }
}

/** Las filas de la base (una página más una); nulo si alguna no tiene la forma esperada. */
export function filasDeStockDesde(datos: unknown): FilaDeStock[] | null {
  if (!Array.isArray(datos)) return null
  const filas = datos.map(filaDeStockDesde)
  return filas.every((f): f is FilaDeStock => f !== null) ? filas : null
}

/** La página que se muestra de lo leído (la base trae una fila de más que dice si hay otra). Sin «Anterior». */
export function paginaDeStock(leidas: readonly FilaDeStock[], tamano: number): PaginaDeStock {
  const filas = leidas.slice(0, tamano)
  const ultima = filas[filas.length - 1]
  return { filas, siguiente: leidas.length > tamano && ultima ? cursorDeStock(ultima) : null }
}
