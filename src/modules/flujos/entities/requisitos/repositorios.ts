// Lo que los requisitos de fase necesitan de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/requisitos/` y la une
// `areas/requisitos/composicion.ts`.
import type { AmbitoDeFlujo } from '../flujo'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { CambiosDeRequisito } from './formulario-de-edicion'
import type { DatosDeDato } from './formulario-de-dato'
import type { DatosDeDocumento } from './formulario-de-documento'
import type { DatosDeEspera } from './formulario-de-espera'
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

// Lo que se pide al crear un requisito: su tipo y los datos que ese tipo admite (`p_tipo` y `p_datos` de `requisito_crear`).
export type ContenidoDeRequisito =
  | { tipo: 'dato'; datos: DatosDeDato }
  | { tipo: 'documento'; datos: DatosDeDocumento }
  | { tipo: 'espera'; datos: DatosDeEspera }

// Las cuatro RPC de escritura. Ninguna devuelve la lista: la pantalla la relee. Todas llevan la versión del flujo que se tenía en pantalla (`PT409` si cambió).
export type RepositorioDeRequisitos = {
  // Con el id del intento: repetirlo da «Ese requisito ya existe» (`23505`). Nace informativo y al final de la fase.
  crear: (
    pedido: {
      id: string
      faseId: string
      actualizadoEnEsperado: string
    } & ContenidoDeRequisito,
  ) => Promise<ResultadoDeRequisito<VersionNueva>>
  // Sólo lo que cambió; `null` vacía el campo.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeRequisito
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
