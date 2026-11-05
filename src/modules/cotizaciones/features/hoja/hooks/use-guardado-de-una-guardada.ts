'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { claveDelPendienteDeUnaGuardada } from '../../../entities/claves-de-la-hoja'
import { textoDelFallo, textoDelRechazo } from '../../../entities/guardado'
import type { ArmadoDeEdicion, PedidoDeEdicion } from '../../../entities/pedido-de-edicion'
import { guardarCotizacion } from '../actions/guardar-cotizacion'
import { CODEC_DE_UNA_GUARDADA, usePendienteEnLaPestana } from './pendiente-en-la-pestana'
import {
  MENSAJE_DE_VALIDACION,
  RESPUESTA_PERDIDA,
  useNucleoDelGuardado,
  type EnvioDeGuardado,
  type EstadoDelGuardado,
  type GuardadoDe,
} from './use-nucleo-del-guardado'

export type GuardadoDeUnaGuardada = GuardadoDe<ArmadoDeEdicion>

// Sin D2: guardar una cotización guardada usa SU versión de la fórmula.
function avisoDe(envio: EnvioDeGuardado): EstadoDelGuardado {
  if (!envio.ok) {
    return { tipo: 'aviso', aviso: textoDelFallo(envio), d2: null }
  }
  const r = envio.data
  const aviso = r.tipo === 'rechazo' ? textoDelRechazo(r.motivo, r.mensaje) : RESPUESTA_PERDIDA
  return { tipo: 'aviso', aviso, d2: null }
}

// Una guardada no tiene D2: nada que guardar «con la abierta».
const SIN_D2 = () => {}

const completar = (armado: ArmadoDeEdicion): PedidoDeEdicion => ({
  ...armado,
  intento: crypto.randomUUID(),
})

// El guardado de una cotización guardada (`/cotizaciones/[id]`, 4.15-3, C8 y C9): el núcleo del guardado sobre `cotizacion_guardar`, con el pendiente de esa cotización en la
// pestaña. Vive en el marco, por encima de la hoja, para sobrevivir a que ella se vuelva a montar con la versión nueva (y conservar el «Cambios guardados.»). No hay D2.
export function useGuardadoDeUnaGuardada({
  personaId,
  cotizacionId,
  alGuardar,
}: {
  personaId: string
  cotizacionId: string
  // Guardado: quien lo usa borra el borrador.
  alGuardar: () => void
}): GuardadoDeUnaGuardada {
  const pendiente = usePendienteEnLaPestana(
    claveDelPendienteDeUnaGuardada({ personaId, cotizacionId }),
    CODEC_DE_UNA_GUARDADA,
  )
  const guardar = useAction(guardarCotizacion)
  const enviar = useCallback(
    (pedido: PedidoDeEdicion) => enviarAccion(guardar.executeAsync(pedido), MENSAJE_DE_VALIDACION),
    [guardar],
  )
  const { publico } = useNucleoDelGuardado({
    pendiente,
    enviar,
    completar,
    avisoDe,
    alGuardar,
    olvidaLoGuardado: true,
  })
  return { ...publico, guardarConLaAbierta: SIN_D2 }
}
