'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeFase } from '../../../entities/fases/formulario-de-fase'
import type { RespuestaDeEliminarFase, RespuestaDeFase } from '../../../entities/fases/respuestas'
import type { ImpactoDeFase } from '../../../entities/fases/vista-de-impacto'
import { crearFase } from '../actions/crear-fase'
import { eliminarFase } from '../actions/eliminar-fase'
import { guardarFase } from '../actions/guardar-fase'
import { leerImpactoDeUnaFase } from '../actions/leer-impacto-de-fase'
import { moverFase } from '../actions/mover-fase'
import { reactivarFase } from '../actions/reactivar-fase'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// De qué flujo se escribe: su versión (la que se tenía en pantalla) y su origen (nulo = repuestos: la action lo necesita para exigir el permiso).
export type FlujoDePedido = { id: string; version: string; origenId: string | null }

// Las Server Actions de la lista de fases, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor).
export function usePedidosDeFases(flujo: FlujoDePedido) {
  const crear = useAction(crearFase)
  const guardando = useAction(guardarFase)
  const mover = useAction(moverFase)
  const eliminar = useAction(eliminarFase)
  const reactivar = useAction(reactivarFase)
  const impacto = useAction(leerImpactoDeUnaFase)
  const { origenId, version } = flujo
  return {
    crear: (id: string, datos: CambiosDeFase) =>
      enviarAccion<RespuestaDeFase>(
        crear.executeAsync({
          id,
          flujoId: flujo.id,
          origenId,
          actualizadoEnEsperado: version,
          datos,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    guardar: (id: string, cambios: CambiosDeFase) =>
      enviarAccion<RespuestaDeFase>(
        guardando.executeAsync({ id, origenId, actualizadoEnEsperado: version, cambios }),
        MENSAJE_DE_VALIDACION,
      ),
    mover: (id: string, despuesDe: string | null) =>
      enviarAccion<RespuestaDeFase>(
        mover.executeAsync({ id, origenId, actualizadoEnEsperado: version, despuesDe }),
        MENSAJE_DE_VALIDACION,
      ),
    eliminar: (id: string) =>
      enviarAccion<RespuestaDeEliminarFase>(
        eliminar.executeAsync({ id, origenId, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ),
    reactivar: (id: string) =>
      enviarAccion<RespuestaDeFase>(
        reactivar.executeAsync({ id, origenId, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ),
    leerImpacto: (id: string) =>
      enviarAccion<ImpactoDeFase>(impacto.executeAsync({ id, origenId }), MENSAJE_DE_VALIDACION),
  }
}
