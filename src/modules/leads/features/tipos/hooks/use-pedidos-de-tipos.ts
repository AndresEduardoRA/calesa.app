'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type {
  ClaseDeTipoDeLead,
  RespuestaDeTipos,
  TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { olvidarDatosDelAlta } from '../../../composicion.client'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearTipo } from '../actions/crear-tipo'
import { eliminarTipo } from '../actions/eliminar-tipo'
import { guardarTipo } from '../actions/guardar-tipo'
import { moverTipo } from '../actions/mover-tipo'

type Pedido = Parameters<typeof enviarAccion<RespuestaDeTipos>>[0]

// Lo que el alta de lead leyó (los orígenes y los tipos activos) deja de valer cuando termina cualquier cambio: crear, renombrar, ordenar,
// activar, desactivar o eliminar. Se olvida al terminar, no antes: una lectura en medio no guardaría lo viejo.
const comoEnvio = async (pedido: Pedido) => {
  const envio = await enviarAccion<RespuestaDeTipos>(pedido, MENSAJE_DE_VALIDACION)
  olvidarDatosDelAlta()
  return envio
}

// Las cuatro Server Actions de los tipos de lead, como funciones que devuelven el envío (el
// resultado, o `sinRed` si no llegó al servidor). Cada una manda la versión que se tenía en pantalla.
export function usePedidosDeTipos() {
  const crear = useAction(crearTipo)
  const guardar = useAction(guardarTipo)
  const mover = useAction(moverTipo)
  const eliminar = useAction(eliminarTipo)
  return {
    crear: (id: string, nombre: string, clase: ClaseDeTipoDeLead, icono: string | null) =>
      comoEnvio(crear.executeAsync({ id, nombre, clase, icono })),
    guardar: (
      tipo: TipoDeLeadConUso,
      cambios: { nombre?: string; icono?: string | null; activo?: boolean },
    ) =>
      comoEnvio(
        guardar.executeAsync({
          id: tipo.id,
          actualizadoEnEsperado: tipo.actualizadoEn,
          ...cambios,
        }),
      ),
    mover: (tipo: TipoDeLeadConUso, despuesDe: string | null) =>
      comoEnvio(
        mover.executeAsync({
          id: tipo.id,
          actualizadoEnEsperado: tipo.actualizadoEn,
          despuesDe,
        }),
      ),
    eliminar: (tipo: TipoDeLeadConUso) =>
      comoEnvio(eliminar.executeAsync({ id: tipo.id, actualizadoEnEsperado: tipo.actualizadoEn })),
  }
}
