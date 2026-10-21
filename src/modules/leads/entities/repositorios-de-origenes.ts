import type { Resultado } from '@/shared/lib/errores'
import type { FalloDeMarca } from './repositorios'
import type { OrigenDeLeadConUso, RespuestaDeOrigenes } from './origen-de-lead'

// Los orígenes del lead (parte 9f-1). Las cuatro escrituras devuelven la lista entera con las
// versiones nuevas (a lo sumo 100 filas). El alta lleva el id del intento: repetirla devuelve el mismo
// origen y el icono (una clave del catálogo o nada). Guardar es nombre, icono, activo y/o «por defecto».
type Respuesta = Promise<{ ok: true; data: RespuestaDeOrigenes } | FalloDeMarca>

export type RepositorioDeOrigenesDeLead = {
  crear: (pedido: { id: string; nombre: string; icono: string | null }) => Respuesta
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string | undefined
    icono?: string | null | undefined
    activo?: boolean | undefined
    porDefecto?: boolean | undefined
  }) => Respuesta
  // «Después de X» (nulo = primero): la base calcula los lugares.
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    despuesDe: string | null
  }) => Respuesta
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
}

// Con si algún lead usa cada origen (para decir antes de intentarlo que uno no se elimina).
export type LectorDeOrigenesDeLeadConUso = () => Promise<Resultado<OrigenDeLeadConUso[]>>
