'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type {
  RespuestaDeTiposDeSeguimiento,
  TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'
import { olvidarDatosDelAlta } from '../../../composicion.client'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearTipoDeSeguimiento } from '../actions/crear-tipo-de-seguimiento'
import { eliminarTipoDeSeguimiento } from '../actions/eliminar-tipo-de-seguimiento'
import { guardarTipoDeSeguimiento } from '../actions/guardar-tipo-de-seguimiento'
import { moverTipoDeSeguimiento } from '../actions/mover-tipo-de-seguimiento'

type Pedido = Parameters<typeof enviarAccion<RespuestaDeTiposDeSeguimiento>>[0]

// Lo que el alta de lead leyó (los tipos de seguimiento activos) deja de valer cuando termina cualquier cambio: crear, renombrar, ordenar,
// activar, desactivar o eliminar. Se olvida al terminar, no antes: una lectura en medio no guardaría lo viejo.
const comoEnvio = async (pedido: Pedido) => {
  const envio = await enviarAccion<RespuestaDeTiposDeSeguimiento>(pedido, MENSAJE_DE_VALIDACION)
  olvidarDatosDelAlta()
  return envio
}

// Las cuatro Server Actions de los tipos de seguimiento, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al
// servidor). Cada una manda la versión que se tenía en pantalla.
export function usePedidosDeTiposDeSeguimiento() {
  const crear = useAction(crearTipoDeSeguimiento)
  const guardar = useAction(guardarTipoDeSeguimiento)
  const mover = useAction(moverTipoDeSeguimiento)
  const eliminar = useAction(eliminarTipoDeSeguimiento)
  return {
    crear: (id: string, nombre: string, icono: string | null) =>
      comoEnvio(crear.executeAsync({ id, nombre, icono })),
    guardar: (
      tipo: TipoDeSeguimientoConUso,
      cambios: { nombre?: string; icono?: string | null; activo?: boolean },
    ) =>
      comoEnvio(
        guardar.executeAsync({
          id: tipo.id,
          actualizadoEnEsperado: tipo.actualizadoEn,
          ...cambios,
        }),
      ),
    mover: (tipo: TipoDeSeguimientoConUso, despuesDe: string | null) =>
      comoEnvio(
        mover.executeAsync({
          id: tipo.id,
          actualizadoEnEsperado: tipo.actualizadoEn,
          despuesDe,
        }),
      ),
    eliminar: (tipo: TipoDeSeguimientoConUso) =>
      comoEnvio(eliminar.executeAsync({ id: tipo.id, actualizadoEnEsperado: tipo.actualizadoEn })),
  }
}
