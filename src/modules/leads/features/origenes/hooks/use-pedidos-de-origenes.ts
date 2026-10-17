'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { OrigenDeLeadConUso, RespuestaDeOrigenes } from '../../../entities/origen-de-lead'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearOrigen } from '../actions/crear-origen'
import { eliminarOrigen } from '../actions/eliminar-origen'
import { guardarOrigen } from '../actions/guardar-origen'
import { moverOrigen } from '../actions/mover-origen'

type Pedido = Parameters<typeof enviarAccion<RespuestaDeOrigenes>>[0]

const comoEnvio = (pedido: Pedido) =>
  enviarAccion<RespuestaDeOrigenes>(pedido, MENSAJE_DE_VALIDACION)

// Las cuatro Server Actions de los orígenes del lead, como funciones que devuelven el envío (el
// resultado, o `sinRed` si no llegó al servidor). Cada una manda la versión que se tenía en pantalla.
export function usePedidosDeOrigenes() {
  const crear = useAction(crearOrigen)
  const guardar = useAction(guardarOrigen)
  const mover = useAction(moverOrigen)
  const eliminar = useAction(eliminarOrigen)
  return {
    crear: (id: string, nombre: string) => comoEnvio(crear.executeAsync({ id, nombre })),
    guardar: (origen: OrigenDeLeadConUso, cambios: { nombre?: string; activo?: boolean }) =>
      comoEnvio(
        guardar.executeAsync({
          id: origen.id,
          actualizadoEnEsperado: origen.actualizadoEn,
          ...cambios,
        }),
      ),
    mover: (origen: OrigenDeLeadConUso, despuesDe: string | null) =>
      comoEnvio(
        mover.executeAsync({
          id: origen.id,
          actualizadoEnEsperado: origen.actualizadoEn,
          despuesDe,
        }),
      ),
    eliminar: (origen: OrigenDeLeadConUso) =>
      comoEnvio(
        eliminar.executeAsync({ id: origen.id, actualizadoEnEsperado: origen.actualizadoEn }),
      ),
  }
}
