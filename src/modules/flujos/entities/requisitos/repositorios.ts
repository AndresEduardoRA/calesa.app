// Lo que los requisitos de fase necesitan de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/requisitos/` y la une
// `areas/requisitos/composicion.ts`.
import type { AmbitoDeFlujo } from '../flujo'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { DatosDeDato } from './formulario-de-dato'
import type { OpcionesDeRequisitos } from './opciones'
import type { VersionNueva } from './respuestas'

// Lo que el bloque necesita nombrar y ofrecer, de un flujo: los tipos de documento (los de toda la empresa y los suyos) y las fases activas del otro
// ámbito, con `tope + 1` leídos por grupo.
export type LectorDeOpcionesDeRequisitos = (pedido: {
  flujoId: string
  ambito: AmbitoDeFlujo
}) => Promise<Resultado<OpcionesDeRequisitos>>

// Una escritura que falla: el error y, si la base nombró un campo del formulario en el `hint`, ese campo.
export type FalloDeRequisito = { ok: false; error: ErrorApp; campo?: string }
export type ResultadoDeRequisito<T> = { ok: true; data: T } | FalloDeRequisito

// Las tres RPC de esta parte. Ninguna devuelve la lista: la pantalla la relee. Todas llevan la versión del flujo que se tenía en pantalla (`PT409` si cambió).
export type RepositorioDeRequisitos = {
  // Con el id del intento: repetirlo da «Ese requisito ya existe» (`23505`). Nace informativo y al final de la fase.
  crearDato: (pedido: {
    id: string
    faseId: string
    actualizadoEnEsperado: string
    datos: DatosDeDato
  }) => Promise<ResultadoDeRequisito<VersionNueva>>
  // «Después de X»; nulo = primero.
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    despuesDe: string | null
  }) => Promise<ResultadoDeRequisito<VersionNueva>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeRequisito<VersionNueva>>
}
