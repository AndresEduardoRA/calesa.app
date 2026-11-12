'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ClaveDeRegla } from '../../../entities/reglas/catalogo'
import type { RespuestaDeCambio } from '../../../entities/reglas/impacto'
import type { BorradorDeOferta } from '../../../entities/reglas/oferta'
import { cambiarRegla } from '../actions/cambiar-regla'
import { guardarOferta } from '../actions/guardar-oferta'

const MENSAJE_DE_VALIDACION = 'Revisa lo que marcaste.'

// Las dos Server Actions de «Reglas», como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Cada una manda la
// versión del flujo que se tenía.
export function usePedidosDeReglas() {
  const cambiar = useAction(cambiarRegla)
  const oferta = useAction(guardarOferta)
  return {
    cambiar: (flujoId: string, version: string, regla: ClaveDeRegla, activa: boolean) =>
      enviarAccion<RespuestaDeCambio>(
        cambiar.executeAsync({ flujoId, actualizadoEnEsperado: version, regla, activa }),
        MENSAJE_DE_VALIDACION,
      ),
    guardarOferta: (flujoId: string, version: string, borrador: BorradorDeOferta) =>
      enviarAccion<{ version: string }>(
        oferta.executeAsync({
          flujoId,
          actualizadoEnEsperado: version,
          puertosOrigen: [...borrador.puertosOrigen],
          puertosDestino: [...borrador.puertosDestino],
          navieras: [...borrador.navieras],
        }),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
