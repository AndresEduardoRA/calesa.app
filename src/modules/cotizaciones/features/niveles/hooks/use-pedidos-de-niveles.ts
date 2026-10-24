'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { NivelDeAcceso, RespuestaDeNiveles } from '../../../entities/nivel'
import { crearNivel } from '../actions/crear-nivel'
import { eliminarNivel } from '../actions/eliminar-nivel'
import { renombrarNivel } from '../actions/renombrar-nivel'
import { restaurarNivel } from '../actions/restaurar-nivel'
import { retirarNivel } from '../actions/retirar-nivel'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Las cinco Server Actions de los niveles, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Cada una
// manda la versión que se tenía en pantalla.
export function usePedidosDeNiveles() {
  const crear = useAction(crearNivel)
  const renombrar = useAction(renombrarNivel)
  const retirar = useAction(retirarNivel)
  const restaurar = useAction(restaurarNivel)
  const eliminar = useAction(eliminarNivel)
  const comoEnvio = (pedido: Parameters<typeof enviarAccion<RespuestaDeNiveles>>[0]) =>
    enviarAccion<RespuestaDeNiveles>(pedido, MENSAJE_DE_VALIDACION)
  const version = (nivel: NivelDeAcceso) => ({
    id: nivel.id,
    actualizadoEnEsperado: nivel.actualizadoEn,
  })
  return {
    crear: (id: string, nombre: string) => comoEnvio(crear.executeAsync({ id, nombre })),
    renombrar: (nivel: NivelDeAcceso, nombre: string) =>
      comoEnvio(renombrar.executeAsync({ ...version(nivel), nombre })),
    retirar: (nivel: NivelDeAcceso) => comoEnvio(retirar.executeAsync(version(nivel))),
    restaurar: (nivel: NivelDeAcceso) => comoEnvio(restaurar.executeAsync(version(nivel))),
    eliminar: (nivel: NivelDeAcceso) => comoEnvio(eliminar.executeAsync(version(nivel))),
  }
}
