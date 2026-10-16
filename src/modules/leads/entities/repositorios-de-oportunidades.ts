// Lo que los casos de uso de embudos y oportunidades necesitan de afuera (parte 7a). Separado de
// `repositorios.ts` por responsabilidad: es otra parte del módulo con sus propias RPC.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Embudo, Etapa } from './embudo'
import type { DatosDeOportunidad, Oportunidad, OportunidadDelLead } from './oportunidad'
import type { Tablero, Tarjeta } from './tablero'

// Un rechazo de la base con el campo del formulario que lo causó (`hint`), si lo dijo.
export type FalloConCampo = { ok: false; error: ErrorApp; campo?: string }
type Respuesta<T> = Promise<{ ok: true; data: T } | FalloConCampo>

// `existente`: el de por defecto ya estaba; `repetido`: el mismo intento ya había entrado;
// `sin_cambios`: ya estaba así (o eliminar uno que ya no está, que vuelve sin embudo).
export type ResultadoDeEmbudo = {
  resultado: 'creado' | 'existente' | 'repetido' | 'guardado' | 'eliminado' | 'sin_cambios'
  embudo: Embudo | null
}

export type RepositorioDeEmbudos = {
  porDefecto: () => Respuesta<ResultadoDeEmbudo>
  crear: (pedido: { id: string; nombre: string }) => Respuesta<ResultadoDeEmbudo>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre: string
  }) => Respuesta<ResultadoDeEmbudo>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta<ResultadoDeEmbudo>
  // El conjunto entero de etapas, en su orden.
  guardarEtapas: (pedido: {
    embudoId: string
    actualizadoEnEsperado: string
    etapas: readonly Etapa[]
  }) => Respuesta<ResultadoDeEmbudo>
}

// Los embudos de quien mira (la RLS da sólo los propios), con sus etapas.
export type LectorDeEmbudos = () => Promise<Resultado<Embudo[]>>

// El kanban de un embudo propio; `null` si no es de quien mira.
export type LectorDeTablero = (pedido: {
  embudoId: string
  tope: number
}) => Promise<Resultado<Tablero | null>>

// «Ver más» de una columna, desde la última que se ve.
export type LectorDePaginaDeEtapa = (pedido: {
  etapaId: string
  antes: { antesEn: string; antesId: string }
  tope: number
}) => Promise<Resultado<{ tarjetas: Tarjeta[]; hayMas: boolean }>>

export type ResultadoDeOportunidad = {
  resultado:
    'creada' | 'repetido' | 'guardada' | 'movida' | 'eliminada' | 'restaurada' | 'sin_cambios'
  oportunidad: Oportunidad
}

export type RepositorioDeOportunidades = {
  // `id` es el del intento: el mismo en cada reintento. Sin embudo, el de por defecto; sin etapa, la inicial.
  crear: (pedido: {
    id: string
    leadId: string
    datos: DatosDeOportunidad & { embudo_id?: string; etapa_id?: string }
  }) => Respuesta<ResultadoDeOportunidad>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Partial<DatosDeOportunidad>
  }) => Respuesta<ResultadoDeOportunidad>
  // `etapaEsperada` es la que tenía en pantalla: si ya está en otra, `conflicto`.
  mover: (pedido: {
    id: string
    etapaEsperada: string
    etapa: string
    motivoPerdida: string | null
  }) => Respuesta<ResultadoDeOportunidad>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Respuesta<ResultadoDeOportunidad>
  restaurar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Respuesta<ResultadoDeOportunidad>
}

// Las de quien mira sobre un lead, con su etapa y su embudo, y si puede crear (cartera + editar).
export type LectorDeOportunidadesDelLead = (
  leadId: string,
) => Promise<
  Resultado<{ puedoCrear: boolean; hayMas: boolean; oportunidades: OportunidadDelLead[] }>
>
