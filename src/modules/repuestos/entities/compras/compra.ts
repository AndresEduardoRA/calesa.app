// Una compra de un proyecto de repuestos tal como la dibuja la lista de la pestaña «Compras» (8.11-2, C1). Puro: la lectura
// (`infra/compras/listar.ts`) la arma con `filasDeCompraDesde`. El equivalente en la moneda base (`monto_base`) lo pone la base al guardar
// (8.11-1): acá se lee, nunca se calcula.
import { z } from 'zod'

// Lo más que lee la lista de un proyecto: 200 compras (se piden 201 para saber si hay más; `cortarAlTope`). No es un total.
export const TOPE_DE_COMPRAS = 200

export type FilaDeCompra = {
  id: string
  itemId: string | null
  // Nula si la compra no es de un ítem o quien mira no ve el ítem (RLS de ítems: eliminado o sin `repuestos.ver`).
  itemDescripcion: string | null
  proveedor: string | null
  moneda: string
  monto: number
  // Nulo en una fila escrita antes de 8.11-1 (la columna admite nulo): no se dibuja el equivalente.
  montoBase: number | null
  // `date` (YYYY-MM-DD).
  fecha: string
  comprobanteRuta: string | null
  notas: string | null
  // ISO: la versión de la fila (la usa editar en 8.11-3).
  actualizadoEn: string
}

// Una lectura, con la descripción del ítem embebida (sin N+1). Lleva ya lo que editar necesita (8.11-3).
export const COLUMNAS_DE_COMPRA =
  'id, item_id, proveedor, moneda, monto, monto_base, fecha, comprobante_ruta, notas, actualizado_en, item:repuestos_items(descripcion)'

const esquemaDeFilaDeBase = z.object({
  id: z.guid(),
  item_id: z.guid().nullable(),
  proveedor: z.string().nullable(),
  moneda: z.string().min(1),
  monto: z.number(),
  monto_base: z.number().nullable(),
  fecha: z.string(),
  comprobante_ruta: z.string().nullable(),
  notas: z.string().nullable(),
  actualizado_en: z.string(),
  item: z.object({ descripcion: z.string() }).nullable(),
})

function aFilaDeCompra(f: z.infer<typeof esquemaDeFilaDeBase>): FilaDeCompra {
  return {
    id: f.id,
    itemId: f.item_id,
    itemDescripcion: f.item?.descripcion ?? null,
    proveedor: f.proveedor,
    // `char(3)`: la base rellena con espacios si el código fuera más corto.
    moneda: f.moneda.trim(),
    monto: f.monto,
    montoBase: f.monto_base,
    fecha: f.fecha,
    comprobanteRuta: f.comprobante_ruta,
    notas: f.notas,
    actualizadoEn: f.actualizado_en,
  }
}

/** Las filas de `repuestos_compras` con su ítem; nulo si alguna no tiene la forma esperada. */
export function filasDeCompraDesde(datos: unknown): FilaDeCompra[] | null {
  const leido = z.array(esquemaDeFilaDeBase).safeParse(datos)
  return leido.success ? leido.data.map(aFilaDeCompra) : null
}
