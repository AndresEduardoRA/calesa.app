'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { OrigenDeLeadConUso, RespuestaDeOrigenes } from '../../../entities/origen-de-lead'
import { olvidarDatosDelAlta } from '../../../composicion.client'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearOrigen } from '../actions/crear-origen'
import { eliminarOrigen } from '../actions/eliminar-origen'
import { guardarOrigen } from '../actions/guardar-origen'
import { moverOrigen } from '../actions/mover-origen'

type Pedido = Parameters<typeof enviarAccion<RespuestaDeOrigenes>>[0]

// Lo que el alta de lead leyó (los orígenes y los tipos activos) deja de valer cuando termina cualquier cambio: crear, renombrar, ordenar,
// activar, desactivar o eliminar. Se olvida al terminar, no antes: una lectura en medio no guardaría lo viejo.
const comoEnvio = async (pedido: Pedido) => {
  const envio = await enviarAccion<RespuestaDeOrigenes>(pedido, MENSAJE_DE_VALIDACION)
  olvidarDatosDelAlta()
  return envio
}

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
