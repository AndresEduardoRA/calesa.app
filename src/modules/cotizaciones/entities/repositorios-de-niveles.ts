import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { ListaDeNiveles, RespuestaDeNiveles } from './nivel'

// Un rechazo con el campo del formulario que lo causó (el `hint` de la base), si lo hay.
export type FalloDeNivel = { ok: false; error: ErrorApp; campo?: string }

// Los niveles de acceso (D7, paso 4.09). Las cinco escrituras devuelven la lista entera con las versiones nuevas y el motivo de uso de cada
// nivel (a lo sumo el tope, que lo pone la base). Crear lleva el id del intento —repetirla devuelve el mismo nivel—; renombrar, retirar,
// restaurar y eliminar llevan la versión que se tenía en pantalla.
type Respuesta = Promise<{ ok: true; data: RespuestaDeNiveles } | FalloDeNivel>

export type RepositorioDeNiveles = {
  crear: (pedido: { id: string; nombre: string }) => Respuesta
  renombrar: (pedido: { id: string; actualizadoEnEsperado: string; nombre: string }) => Respuesta
  retirar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
  restaurar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
}

// Los niveles con su uso y las banderas de lo que cada uno admite (`niveles_con_uso()`): para quien lee o gestiona los roles.
export type LectorDeNiveles = () => Promise<Resultado<ListaDeNiveles>>
