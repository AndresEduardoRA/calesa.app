// Lo que las fases necesitan de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/fases/` y la une `areas/fases/composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { CambiosDeFase } from './formulario-de-fase'
import type { RespuestaDeEliminarFase, RespuestaDeFase } from './respuestas'
import type { CampoDeFase } from './reglas-de-fase'
import type { ImpactoDeFase } from './vista-de-impacto'

// Lo que usa una fase y qué haría eliminarla. Sólo quien configura el flujo: a los demás la base les dice `42501`.
export type LectorDeImpactoDeFase = (faseId: string) => Promise<Resultado<ImpactoDeFase>>

// Una escritura que falla: el error y, si la base nombró un campo del formulario en el `hint`, ese campo.
export type FalloDeFase = { ok: false; error: ErrorApp; campo?: CampoDeFase }
export type ResultadoDeFase<T> = { ok: true; data: T } | FalloDeFase

// Las cinco RPC de escritura. Ninguna devuelve la lista: la pantalla la relee. Todas llevan la versión que se tenía en pantalla (`PT409` si cambió).
export type RepositorioDeFases = {
  // Con el id del intento: repetirlo da «Esa fase ya existe.» (la base no lo trata como el mismo pedido).
  crear: (pedido: {
    id: string
    flujoId: string
    actualizadoEnEsperado: string
    datos: CambiosDeFase
  }) => Promise<ResultadoDeFase<RespuestaDeFase>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeFase
  }) => Promise<ResultadoDeFase<RespuestaDeFase>>
  // «Después de X»; nulo = primera. Mover mueve la versión del flujo.
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    despuesDe: string | null
  }) => Promise<ResultadoDeFase<RespuestaDeFase>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeFase<RespuestaDeEliminarFase>>
  reactivar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeFase<RespuestaDeFase>>
}
