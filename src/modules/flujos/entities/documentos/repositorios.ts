// Lo que los tipos de documento necesitan de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/documentos/` y la une
// `areas/documentos/composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { CambiosDeTipo, CampoDeTipo } from './formulario-de-tipo'
import type { RespuestaDeEscritura } from './respuestas'
import type { GrupoDeTipos, RespuestaDeEliminar, UsoDeTipo } from './tipo-de-documento'

// Un grupo: los de toda la empresa (`null`) o los de un flujo, en el orden en que se ven, con `tope + 1` leídos.
export type LectorDeTiposDeDocumento = (flujoId: string | null) => Promise<Resultado<GrupoDeTipos>>

// Cuánto usa cada tipo del grupo (por id). Sólo quien puede cambiar el grupo: a los demás la base les dice `42501`.
export type LectorDeUsoDeTipos = (
  flujoId: string | null,
) => Promise<Resultado<Record<string, UsoDeTipo>>>

// Una escritura que falla: el error y, si la base nombró un campo del formulario en el `hint`, ese campo.
export type FalloDeTipo = { ok: false; error: ErrorApp; campo?: CampoDeTipo }
export type ResultadoDeTipo<T> = { ok: true; data: T } | FalloDeTipo

// Las cuatro RPC. Ninguna devuelve la lista: la pantalla la relee.
export type RepositorioDeTiposDeDocumento = {
  // Con el id del intento: repetirlo devuelve el mismo (`repetido`).
  crear: (pedido: {
    id: string
    flujoId: string | null
    cambios: CambiosDeTipo
  }) => Promise<ResultadoDeTipo<RespuestaDeEscritura>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeTipo
  }) => Promise<ResultadoDeTipo<RespuestaDeEscritura>>
  // «Después de X»; nulo = primero. Ordenar no mueve la versión.
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    despuesDe: string | null
  }) => Promise<ResultadoDeTipo<RespuestaDeEscritura>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeTipo<RespuestaDeEliminar>>
}
