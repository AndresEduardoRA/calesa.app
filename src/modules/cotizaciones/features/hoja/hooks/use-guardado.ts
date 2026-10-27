'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { claveDelPendiente, type DeLaPestana } from '../../../entities/claves-de-la-hoja'
import {
  textoDelFallo,
  textoDelRechazo,
  type CotizacionGuardada,
  type TextoDelAviso,
} from '../../../entities/guardado'
import { queEnviar, trasElEnvio, type EnvioDeGuardado } from '../../../entities/intento-de-guardado'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import { crearCotizacion } from '../actions/crear-cotizacion'
import { usePendienteEnLaPestana } from './pendiente-en-la-pestana'

// Lo que la hoja arma para guardar, cuando el total está al día; nulo si no hay que guardar (el recálculo falló, el total quedó nulo, la hoja se fue).
export type PedidoArmado = Omit<PedidoDeGuardado, 'intento' | 'conLaAbierta'>
export type Armar = (listo: (pedido: PedidoArmado | null) => void) => void

// D2: la hoja desactualizada por una versión nueva de la fórmula o por un tipo de cambio, con el pedido que la recibió.
export type AvisoD2 = { pedido: PedidoDeGuardado; por: 'formula' | 'tipo_cambio' }

export type EstadoDelGuardado =
  | { tipo: 'listo' }
  // P8: se espera al total al día antes de mandar.
  | { tipo: 'esperando_total' }
  | { tipo: 'guardando' }
  // Un rechazo o un fallo, con su texto y su salida. `d2` es el pedido que recibió la hoja desactualizada: «Guardar con la N» manda ése, no lo de la hoja de ahora.
  | { tipo: 'aviso'; aviso: TextoDelAviso; d2: AvisoD2 | null }
  | { tipo: 'guardada'; cotizacion: CotizacionGuardada; fueReenvio: boolean }

const MENSAJE_DE_VALIDACION = 'La hoja mandó algo que no esperábamos.'
const RESPUESTA_PERDIDA: TextoDelAviso = {
  texto: 'No supimos si se guardó. «Guardar» lo vuelve a mandar tal como estaba.',
  salida: 'reintentar',
}

function avisoDe(envio: EnvioDeGuardado, pedido: PedidoDeGuardado): EstadoDelGuardado {
  if (!envio.ok) {
    return { tipo: 'aviso', aviso: textoDelFallo(envio), d2: null }
  }
  const r = envio.data
  if (r.tipo === 'perdida') {
    return { tipo: 'aviso', aviso: RESPUESTA_PERDIDA, d2: null }
  }
  if (r.tipo === 'rechazo') {
    const aviso = textoDelRechazo(r.motivo)
    const por = r.motivo === 'desactualizada_tipo_cambio' ? 'tipo_cambio' : 'formula'
    return { tipo: 'aviso', aviso, d2: aviso.salida === 'd2' ? { pedido, por } : null }
  }
  return { tipo: 'aviso', aviso: RESPUESTA_PERDIDA, d2: null }
}

// Manda un pedido ya anotado y pone el estado con lo que vuelva.
function useMandar(
  pestana: ReturnType<typeof usePendienteEnLaPestana>,
  setEstado: (e: EstadoDelGuardado) => void,
  ocupadoRef: RefObject<boolean>,
  alGuardar: () => void,
) {
  const crear = useAction(crearCotizacion)
  const alGuardarRef = useRef(alGuardar)
  useEffect(() => {
    alGuardarRef.current = alGuardar
  })
  return useCallback(
    async (pedido: PedidoDeGuardado, esReenvio: boolean) => {
      pestana.anotar(pedido)
      setEstado({ tipo: 'guardando' })
      const envio = await enviarAccion(crear.executeAsync(pedido), MENSAJE_DE_VALIDACION)
      if (trasElEnvio(envio) === 'soltar') {
        pestana.soltar()
      }
      ocupadoRef.current = false
      if (envio.ok && envio.data.tipo === 'guardada') {
        setEstado({ tipo: 'guardada', cotizacion: envio.data.cotizacion, fueReenvio: esReenvio })
        alGuardarRef.current()
        return
      }
      setEstado(avisoDe(envio, pedido))
    },
    [crear, pestana, setEstado, ocupadoRef],
  )
}

// El guardado de una hoja (paso 4.13-3b): vive en el marco, por encima de la hoja, para sobrevivir a que ella se vuelva a montar. Cada guardado nuevo lleva un intento nuevo;
// el pedido se anota como **pendiente** antes de salir y se suelta con toda respuesta que trae SQLSTATE (`trasElEnvio`). Con un pendiente vivo, «Guardar» reenvía ese
// pedido tal cual, sin las guardas de la hoja (ya se armó y ya se pudo guardar). Un envío a la vez: la marca se pone al pedir, también mientras se espera el total.
export function useGuardado({
  hoja,
  alGuardar,
}: {
  // La hoja de quien cotiza en la pestaña: la clave de su pendiente.
  hoja: DeLaPestana
  // Guardado: quien lo usa borra el borrador.
  alGuardar: () => void
}) {
  const pestana = usePendienteEnLaPestana(claveDelPendiente(hoja))
  const [estado, setEstado] = useState<EstadoDelGuardado>({ tipo: 'listo' })
  const ocupadoRef = useRef(false)
  const mandar = useMandar(pestana, setEstado, ocupadoRef, alGuardar)

  // Con un pendiente, ése; si no, lo que la hoja arme con el total al día.
  const guardar = useCallback(
    (armar: Armar) => {
      if (ocupadoRef.current) {
        return
      }
      ocupadoRef.current = true
      const pendiente = pestana.actual()
      if (pendiente !== null) {
        void mandar(pendiente, true)
        return
      }
      setEstado({ tipo: 'esperando_total' })
      armar((armado) => {
        if (armado === null) {
          ocupadoRef.current = false
          setEstado({ tipo: 'listo' })
          return
        }
        const { pedido, esReenvio } = queEnviar(pestana.actual(), {
          ...armado,
          intento: crypto.randomUUID(),
          conLaAbierta: false,
        })
        void mandar(pedido, esReenvio)
      })
    },
    [mandar, pestana],
  )

  // Al volver la red, el pendiente sale solo, una vez.
  const enLinea = useReintentoAlVolver(
    estado.tipo === 'aviso' ? pestana.pendiente : null,
    async (pendiente) => {
      if (ocupadoRef.current) {
        return false
      }
      ocupadoRef.current = true
      await mandar(pendiente, true)
      return true
    },
  )

  // «Guardar con la versión N» (o «con el de la hoja»): el pedido que recibió el D2, no lo de la hoja de ahora, con otro intento y con la abierta.
  const guardarConLaAbierta = useCallback(() => {
    if (ocupadoRef.current || estado.tipo !== 'aviso' || estado.d2 === null) {
      return
    }
    ocupadoRef.current = true
    void mandar({ ...estado.d2.pedido, intento: crypto.randomUUID(), conLaAbierta: true }, false)
  }, [estado, mandar])

  return {
    estado,
    enLinea,
    guardarConLaAbierta,
    hayPendiente: pestana.pendiente !== null,
    ocupado: estado.tipo === 'esperando_total' || estado.tipo === 'guardando',
    guardar,
    // Una confirmación nueva en la hoja: el aviso del último intento ya no habla de lo que se ve.
    olvidarAviso: useCallback(() => {
      setEstado((antes) => (antes.tipo === 'aviso' ? { tipo: 'listo' } : antes))
    }, []),
    // «Cotizar otra»: lo guardado se va, y con él el intento.
    reiniciar: useCallback(() => {
      pestana.soltar()
      ocupadoRef.current = false
      setEstado({ tipo: 'listo' })
    }, [pestana]),
  }
}

export type Guardado = ReturnType<typeof useGuardado>
