import { z } from 'zod'

// Un ítem de un proyecto de repuestos tal como lo dibuja la hoja (8.09-2, C2). Vive en el núcleo porque lo leen varias áreas (la hoja, el stock de 8.10, las compras de
// 8.11) y un área no importa otra. Puro: la lectura (`infra/items/leer.ts`) lo arma con `filasDeItemDesde` y la hoja no vuelve a validar nada.
//
// Lo más que lee la hoja de un proyecto: 200 ítems (se piden 201 para saber si hay más; `cortarAlTope`). No es un total: un proyecto con más se corta y lo dice.
export const TOPE_DE_ITEMS_DE_LA_HOJA = 200

export type FaseDelItem = { id: string; nombre: string; color: string; esFinal: boolean }

export type FilaDeItem = {
  id: string
  proyectoId: string
  descripcion: string
  tipoPiezaId: string | null
  condicionId: string | null
  paisOrigenId: string | null
  modoTransporteId: string | null
  cantidad: number
  // Precio al cliente: `numeric(18,2)`, nulo = sin precio. No es un costo (los costos viven en las compras).
  precioCliente: number | null
  moneda: string | null
  tracking: string | null
  notas: string | null
  fase: FaseDelItem | null
  // Con `en_stock_desde` el ítem ya no está pendiente (lo cuenta igual la base en `repuestos_proyectos_listar`).
  enStock: boolean
  // ISO: la versión de la fila.
  actualizadoEn: string
}

// Las columnas que pide la hoja, con la fase embebida (una lectura, sin N+1).
export const COLUMNAS_DE_ITEM =
  'id, proyecto_id, descripcion, tipo_pieza_id, condicion_id, pais_origen_id, modo_transporte_id, cantidad, precio_cliente, moneda, tracking, notas, en_stock_desde, actualizado_en, fase:fases(id, nombre, color, es_final)'

const esquemaDeFilaDeBase = z.object({
  id: z.guid(),
  proyecto_id: z.guid(),
  descripcion: z.string(),
  tipo_pieza_id: z.guid().nullable(),
  condicion_id: z.guid().nullable(),
  pais_origen_id: z.guid().nullable(),
  modo_transporte_id: z.guid().nullable(),
  cantidad: z.number().int(),
  precio_cliente: z.number().nullable(),
  moneda: z.string().nullable(),
  tracking: z.string().nullable(),
  notas: z.string().nullable(),
  en_stock_desde: z.string().nullable(),
  actualizado_en: z.string(),
  fase: z
    .object({ id: z.guid(), nombre: z.string(), color: z.string(), es_final: z.boolean() })
    .nullable(),
})

export type FilaDeItemDeLaBase = z.infer<typeof esquemaDeFilaDeBase>

function aFilaDeItem(f: FilaDeItemDeLaBase): FilaDeItem {
  return {
    id: f.id,
    proyectoId: f.proyecto_id,
    descripcion: f.descripcion,
    tipoPiezaId: f.tipo_pieza_id,
    condicionId: f.condicion_id,
    paisOrigenId: f.pais_origen_id,
    modoTransporteId: f.modo_transporte_id,
    cantidad: f.cantidad,
    precioCliente: f.precio_cliente,
    // `char(3)`: la base rellena con espacios si el código fuera más corto; los códigos de moneda tienen tres letras.
    moneda: f.moneda === null ? null : f.moneda.trim(),
    tracking: f.tracking,
    notas: f.notas,
    fase:
      f.fase === null
        ? null
        : { id: f.fase.id, nombre: f.fase.nombre, color: f.fase.color, esFinal: f.fase.es_final },
    enStock: f.en_stock_desde !== null,
    actualizadoEn: f.actualizado_en,
  }
}

/** Las filas de `repuestos_items` con su fase; nulo si alguna no tiene la forma esperada. */
export function filasDeItemDesde(datos: unknown): FilaDeItem[] | null {
  const leido = z.array(esquemaDeFilaDeBase).safeParse(datos)
  return leido.success ? leido.data.map(aFilaDeItem) : null
}

/** Una sola fila (la que devuelve guardar o crear); nulo si no tiene la forma esperada. */
export function filaDeItemDesde(dato: unknown): FilaDeItem | null {
  const leido = esquemaDeFilaDeBase.safeParse(dato)
  return leido.success ? aFilaDeItem(leido.data) : null
}

/** Los que faltan terminar: fuera de stock y sin fase o en una fase que no es final (la misma cuenta que `repuestos_proyectos_listar`). */
export function pendientesDe(filas: readonly FilaDeItem[]): number {
  return filas.filter((f) => !f.enStock && !(f.fase?.esFinal ?? false)).length
}
