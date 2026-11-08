// Lo que los comentarios de una cotización necesitan para escribirse, dicho como interfaz (4.27-2). La implementación (Supabase, por RPC) vive en
// `infra/comentarios/escribir.ts` y se la entrega `areas/comentarios/composicion.ts`. La base pide ver la cotización, ser el autor (o moderar, para borrar) y la versión.
import type { Resultado } from '@/shared/lib/errores'
import type { Comentario, ResultadoDeBorrar } from './comentario'

export type RepositorioDeComentarios = {
  // Comenta (sin padre) o responde una raíz; devuelve el comentario como lo lee la lista.
  comentar: (pedido: {
    cotizacionId: string
    padreId: string | null
    cuerpo: string
  }) => Promise<Resultado<Comentario>>
  editar: (pedido: {
    comentarioId: string
    actualizadoEnEsperado: string
    cuerpo: string
  }) => Promise<Resultado<Comentario>>
  borrar: (pedido: {
    comentarioId: string
    actualizadoEnEsperado: string
  }) => Promise<Resultado<ResultadoDeBorrar>>
}
