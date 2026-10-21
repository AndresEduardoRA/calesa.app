import type { Resultado } from '@/shared/lib/errores'
import type { FalloDeMarca } from './repositorios'
import type {
  ListaDeTiposDeSeguimiento,
  RespuestaDeTiposDeSeguimiento,
} from './tipo-de-seguimiento'

// Los tipos de seguimiento (Configuración de leads). Las cuatro escrituras devuelven la lista entera con las versiones nuevas (a lo
// sumo el tope, que lo pone la base). Crear lleva el id del intento —repetirla devuelve el mismo tipo— y el icono (una clave del
// catálogo o nada). Guardar es nombre, icono y/o activo.
type Respuesta = Promise<{ ok: true; data: RespuestaDeTiposDeSeguimiento } | FalloDeMarca>

export type RepositorioDeTiposDeSeguimiento = {
  crear: (pedido: { id: string; nombre: string; icono: string | null }) => Respuesta
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string | undefined
    icono?: string | null | undefined
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

// Con su icono y si algún seguimiento usa cada tipo (para decir antes de intentarlo que uno no se elimina).
export type LectorDeTiposDeSeguimientoConUso = () => Promise<Resultado<ListaDeTiposDeSeguimiento>>
