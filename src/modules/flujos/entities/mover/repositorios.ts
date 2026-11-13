// Lo que `mover` necesita de afuera, dicho como interfaz. La implementación (Supabase) vive en `infra/mover/` y la une `areas/mover/composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { FlujoDeOrigen } from './flujo-de-origen'
import type { DestinoDeMover, UnidadParaMover } from './para-mover'
import type { UnidadAMover } from './unidad-a-mover'
import type { FilaDelLote, VistaPrevia, VistaPreviaDeUnaUnidad } from './vista-previa'

// El flujo de vehículos del origen con sus reglas activas y los atributos de sus fases. `null` si el origen no tiene flujo (uno recién creado).
export type LectorDeFlujoDeOrigen = (origenId: string) => Promise<Resultado<FlujoDeOrigen | null>>

// Un rechazo de mover: el error y, si la base lo dijo en el `hint`, su código (`conflicto`, `requisitos`, `rol`, `nota`, `transicion`, `acceso`…).
export type FalloDeMover = { ok: false; error: ErrorApp; codigo?: string }
export type ResultadoDeMover<T> = { ok: true; data: T } | FalloDeMover

// Las cuatro RPC de mover y las lecturas que las acompañan (6.02). Una unidad es un vehículo o un ítem de repuesto (8.13-1); el lote es sólo de vehículos.
export type RepositorioDeMover = {
  // Vehículo: `logistica_unidad` (dónde está, si está fuera de regla y quién la movió por última vez). Repuesto: `repuestos_items` bajo la RLS, sin fuera de regla ni quién la movió.
  leerUnidad: (unidad: UnidadAMover) => Promise<Resultado<UnidadParaMover>>
  // Las salidas de la fase (o las fases iniciales activas del origen si no tiene fase), hasta `tope + 1`: `hayMas` dice si llegó. Las de un ítem salen del flujo de repuestos, sin origen.
  leerDestinos: (pedido: {
    ambito: { tipo: 'vehiculo'; origenId: string } | { tipo: 'repuesto' }
    faseId: string | null
    tope: number
  }) => Promise<Resultado<{ destinos: DestinoDeMover[]; hayMas: boolean }>>
  previsualizar: (pedido: {
    unidad: UnidadAMover
    faseDestino: string
  }) => Promise<Resultado<VistaPrevia>>
  previsualizarLote: (pedido: {
    vehiculos: readonly string[]
    faseDestino: string
  }) => Promise<Resultado<VistaPreviaDeUnaUnidad[]>>
  // `cambiar_fase`: devuelve el id del historial. La fase esperada es la que se veía (nula sólo si no tenía fase).
  cambiar: (pedido: {
    unidad: UnidadAMover
    faseDestino: string
    faseEsperada: string | null
    nota: string | null
  }) => Promise<ResultadoDeMover<{ historialId: number }>>
  // `cambiar_fase_lote`: una fila por unidad, en el orden del pedido; un lote mal formado no mueve nada.
  cambiarLote: (pedido: {
    unidades: readonly { vehiculoId: string; faseEsperada: string | null }[]
    faseDestino: string
    nota: string | null
  }) => Promise<ResultadoDeMover<FilaDelLote[]>>
}
