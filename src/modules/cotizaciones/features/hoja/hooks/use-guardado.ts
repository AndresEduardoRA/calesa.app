'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { claveDelPendiente, type DeLaPestana } from '../../../entities/claves-de-la-hoja'
import { textoDelFallo, textoDelRechazo } from '../../../entities/guardado'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import { crearCotizacion } from '../actions/crear-cotizacion'
import { CODEC_DE_LA_NUEVA, usePendienteEnLaPestana } from './pendiente-en-la-pestana'
import {
  MENSAJE_DE_VALIDACION,
  RESPUESTA_PERDIDA,
  useNucleoDelGuardado,
  type EnvioDeGuardado,
  type EstadoDelGuardado,
  type PedidoArmado,
} from './use-nucleo-del-guardado'

export type {
  Armar,
  AvisoD2,
  EstadoDelGuardado,
  Guardado,
  PedidoArmado,
} from './use-nucleo-del-guardado'

function avisoDe(envio: EnvioDeGuardado, pedido: PedidoDeGuardado): EstadoDelGuardado {
  if (!envio.ok) {
    return { tipo: 'aviso', aviso: textoDelFallo(envio), d2: null }
  }
  const r = envio.data
  if (r.tipo === 'perdida') {
    return { tipo: 'aviso', aviso: RESPUESTA_PERDIDA, d2: null }
  }
  if (r.tipo === 'rechazo') {
    const aviso = textoDelRechazo(r.motivo, r.mensaje)
    const por = r.motivo === 'desactualizada_tipo_cambio' ? 'tipo_cambio' : 'formula'
    return { tipo: 'aviso', aviso, d2: aviso.salida === 'd2' ? { pedido, por } : null }
  }
  return { tipo: 'aviso', aviso: RESPUESTA_PERDIDA, d2: null }
}

// Cada guardado nuevo lleva un intento nuevo, y sin «Guardar con la abierta».
const completar = (armado: PedidoArmado): PedidoDeGuardado => ({
  ...armado,
  intento: crypto.randomUUID(),
  conLaAbierta: false,
})

// El guardado de la hoja nueva (paso 4.13-3b): vive en el marco, por encima de la hoja, para sobrevivir a que ella se vuelva a montar. Es el núcleo (`useNucleoDelGuardado`: el
// pendiente 4-21, un envío a la vez, el reintento al volver la red) sobre `cotizacion_crear`, más D2: «Guardar con la versión N» manda el pedido que recibió la hoja
// desactualizada, con otro intento y con la abierta.
export function useGuardado({
  hoja,
  alGuardar,
}: {
  // La hoja de quien cotiza en la pestaña: la clave de su pendiente.
  hoja: DeLaPestana
  // Guardado: quien lo usa borra el borrador.
  alGuardar: () => void
}) {
  const pendiente = usePendienteEnLaPestana(claveDelPendiente(hoja), CODEC_DE_LA_NUEVA)
  const crear = useAction(crearCotizacion)
  const enviar = useCallback(
    (pedido: PedidoDeGuardado) => enviarAccion(crear.executeAsync(pedido), MENSAJE_DE_VALIDACION),
    [crear],
  )
  const { publico, mandar, ocupadoRef } = useNucleoDelGuardado({
    pendiente,
    enviar,
    completar,
    avisoDe,
    alGuardar,
    olvidaLoGuardado: false,
  })

  // «Guardar con la versión N» (o «con el de la hoja»): el pedido que recibió el D2, no lo de la hoja de ahora, con otro intento y con la abierta.
  const { estado } = publico
  const guardarConLaAbierta = useCallback(() => {
    if (ocupadoRef.current || estado.tipo !== 'aviso' || estado.d2 === null) {
      return
    }
    ocupadoRef.current = true
    void mandar({ ...estado.d2.pedido, intento: crypto.randomUUID(), conLaAbierta: true }, false)
  }, [estado, mandar, ocupadoRef])

  return { ...publico, guardarConLaAbierta }
}
