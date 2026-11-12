// Escribir ítems, dicho como interfaz (8.09-2). La implementación (Supabase) vive en `infra/items/` y se la entrega `areas/items/composicion.ts`. Leer es `leerItemsDelProyecto` y `leerItem`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FilaDeItem } from '../nucleo/item'
import type { FilaDeUpdate } from './celda'

export type RepositorioDeItems = {
  // Una celda: un `update` por columna con la versión que se vio. Cero filas nunca es éxito: sin el ítem es «ya no existe» y con él es un conflicto. Devuelve la fila entera, con su fase.
  guardar: (pedido: {
    id: string
    fila: FilaDeUpdate
    actualizadoEn: string
  }) => Promise<ResultadoDeAccion<FilaDeItem>>
  // `repuesto_item_crear`: idempotente por `id` (el que genera la fila nueva al abrirse). Devuelve la fila entera, con su fase.
  crear: (pedido: {
    id: string
    proyectoId: string
    datos: DatosDeItemNuevo
  }) => Promise<ResultadoDeAccion<FilaDeItem>>
  // `repuesto_item_eliminar` con la versión que se vio. Uno con historial, documentos, compras, gastos o stock no se borra: la base dice por qué.
  eliminar: (pedido: {
    id: string
    actualizadoEn: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
}

// Lo que acepta `repuesto_item_crear` en `p_datos` desde la hoja: la descripción y, si ya se tecleó, la cantidad, el precio y su moneda.
export type DatosDeItemNuevo = {
  descripcion: string
  cantidad?: number
  precio_cliente?: number
  moneda?: string
}
