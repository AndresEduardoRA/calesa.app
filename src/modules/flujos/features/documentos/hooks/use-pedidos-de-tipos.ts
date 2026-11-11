'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeTipo, DatosParaCrear } from '../../../entities/documentos/formulario-de-tipo'
import type { RespuestaDeEscritura } from '../../../entities/documentos/respuestas'
import type {
  RespuestaDeEliminar,
  TipoDeDocumento,
} from '../../../entities/documentos/tipo-de-documento'
import { crearTipoDeDocumento } from '../actions/crear-tipo-de-documento'
import { eliminarTipoDeDocumento } from '../actions/eliminar-tipo-de-documento'
import { guardarTipoDeDocumento } from '../actions/guardar-tipo-de-documento'
import { moverTipoDeDocumento } from '../actions/mover-tipo-de-documento'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Las cuatro Server Actions de los tipos de documento, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor).
// Cada una manda el grupo (`flujoId`: nulo = toda la empresa) y la versión que se tenía en pantalla.
export function usePedidosDeTipos() {
  const crear = useAction(crearTipoDeDocumento)
  const guardar = useAction(guardarTipoDeDocumento)
  const mover = useAction(moverTipoDeDocumento)
  const eliminar = useAction(eliminarTipoDeDocumento)
  return {
    crear: (id: string, flujoId: string | null, cambios: DatosParaCrear) =>
      enviarAccion<RespuestaDeEscritura>(
        crear.executeAsync({ id, flujoId, cambios }),
        MENSAJE_DE_VALIDACION,
      ),
    guardar: (tipo: TipoDeDocumento, cambios: CambiosDeTipo) =>
      enviarAccion<RespuestaDeEscritura>(
        guardar.executeAsync({
          id: tipo.id,
          flujoId: tipo.flujoId,
          actualizadoEnEsperado: tipo.actualizadoEn,
          cambios,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    mover: (tipo: TipoDeDocumento, despuesDe: string | null) =>
      enviarAccion<RespuestaDeEscritura>(
        mover.executeAsync({
          id: tipo.id,
          flujoId: tipo.flujoId,
          actualizadoEnEsperado: tipo.actualizadoEn,
          despuesDe,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    eliminar: (tipo: TipoDeDocumento) =>
      enviarAccion<RespuestaDeEliminar>(
        eliminar.executeAsync({
          id: tipo.id,
          flujoId: tipo.flujoId,
          actualizadoEnEsperado: tipo.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
