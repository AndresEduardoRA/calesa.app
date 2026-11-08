'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { RespuestaDeTonos } from '../../../entities/diseno/respuesta-de-tonos'
import type { CambiosDeUnTono, ColoresDeUnTono, Tono } from '../../../entities/diseno/tonos'
import { crearTono } from '../actions/crear-tono'
import { eliminarTono } from '../actions/eliminar-tono'
import { guardarTono } from '../actions/guardar-tono'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Las tres Server Actions de los tonos, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Guardar y eliminar mandan la
// versión que se tenía en pantalla.
export function usePedidosDeTonos() {
  const crear = useAction(crearTono)
  const guardar = useAction(guardarTono)
  const eliminar = useAction(eliminarTono)
  const comoEnvio = (pedido: Parameters<typeof enviarAccion<RespuestaDeTonos>>[0]) =>
    enviarAccion<RespuestaDeTonos>(pedido, MENSAJE_DE_VALIDACION)
  const version = (tono: Tono) => ({ id: tono.id, actualizadoEnEsperado: tono.actualizadoEn })
  return {
    crear: (id: string, nombre: string, colores: ColoresDeUnTono) =>
      comoEnvio(crear.executeAsync({ id, nombre, colores })),
    guardar: (tono: Tono, cambios: CambiosDeUnTono) =>
      comoEnvio(guardar.executeAsync({ ...version(tono), cambios })),
    eliminar: (tono: Tono) => comoEnvio(eliminar.executeAsync(version(tono))),
  }
}
