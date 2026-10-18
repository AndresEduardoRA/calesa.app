import type { Resultado } from '@/shared/lib/errores'
import type { FalloDeMarca } from './repositorios'
import type { ClaseDeTipoDeLead, ListaDeTipos, RespuestaDeTipos } from './tipo-de-lead'

// Los tipos de lead (parte 9j). Las cuatro escrituras devuelven la lista entera con las versiones nuevas (a lo sumo el tope, que
// lo pone la base). El alta lleva el id del intento —repetirla devuelve el mismo tipo— y la clase, que no se cambia después.
// Guardar es nombre y/o activo.
type Respuesta = Promise<{ ok: true; data: RespuestaDeTipos } | FalloDeMarca>

export type RepositorioDeTiposDeLead = {
  crear: (pedido: { id: string; nombre: string; clase: ClaseDeTipoDeLead }) => Respuesta
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string | undefined
    activo?: boolean | undefined
  }) => Respuesta
  // «Después de X» (nulo = primero): la base calcula los lugares.
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    despuesDe: string | null
  }) => Respuesta
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
}

// Con su clase y si algún lead usa cada tipo (para decir antes de intentarlo que uno no se elimina o no se apaga).
export type LectorDeTiposDeLeadConUso = () => Promise<Resultado<ListaDeTipos>>
