// Leer, agregar y quitar las imágenes de un ítem, dicho como interfaz (8.09-3). La implementación (Supabase) vive en `infra/items/imagenes.ts` y se la entrega `areas/items/composicion.ts`.
// Los objetos los sube el navegador (`subirPorHash`); este repositorio sólo registra la ruta. Nunca borra un objeto: borrar la fila lo encola la base.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { ImagenDeItem } from './imagenes'

export type ResultadoDeAgregar = {
  imagenes: ImagenDeItem[]
  agregadas: number
  repetidas: number
  sinLugar: number
}

export type RepositorioDeImagenes = {
  // Las imágenes del ítem por su `orden`, hasta el tope. Un ítem que no existe o que no se ve vuelve como lista vacía.
  listar: (itemId: string) => Promise<Resultado<ImagenDeItem[]>>
  // Registra las rutas que caben (lo repetido sale sin error, lo que no cabe se cuenta). Un rechazo de la base (tope, proyecto cerrado, objeto sin subir) es un fallo con su mensaje.
  agregar: (pedido: {
    itemId: string
    rutas: readonly string[]
  }) => Promise<ResultadoDeAccion<ResultadoDeAgregar>>
  // Borra la fila; el objeto lo encola la base para limpiar por refcount. Ya borrada es éxito idempotente (`ruta: null`).
  quitar: (imagenId: string) => Promise<ResultadoDeAccion<{ id: string; ruta: string | null }>>
}
