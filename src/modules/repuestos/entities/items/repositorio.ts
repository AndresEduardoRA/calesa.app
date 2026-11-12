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
}
