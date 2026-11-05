'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type {
  CotizacionGuardada,
  ResultadoDeCrear,
  TextoDelAviso,
} from '../../../entities/guardado'
import { queEnviar, trasElEnvio } from '../../../entities/intento-de-guardado'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import type { usePendienteEnLaPestana } from './pendiente-en-la-pestana'

// Lo que la hoja arma para guardar, cuando el total está al día; nulo si no hay que guardar (el recálculo falló, el total quedó nulo, la hoja se fue).
export type PedidoArmado = Omit<PedidoDeGuardado, 'intento' | 'conLaAbierta'>
export type ArmarDe<A> = (listo: (armado: A | null) => void) => void
export type Armar = ArmarDe<PedidoArmado>

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

// Lo que la hoja ve de su guardado, sea el de la hoja nueva o el de una guardada. `A` es lo que arma la hoja para ese guardado.
export type GuardadoDe<A> = {
  estado: EstadoDelGuardado
  enLinea: boolean
  guardarConLaAbierta: () => void
  hayPendiente: boolean
  ocupado: boolean
  guardar: (armar: ArmarDe<A>) => void
  olvidarAviso: () => void
  reiniciar: () => void
}
export type Guardado = GuardadoDe<PedidoArmado>

// Lo que el aviso y el marco leen de cualquiera de los dos.
export type VistaDelGuardado = Pick<
  GuardadoDe<unknown>,
  'estado' | 'enLinea' | 'guardarConLaAbierta' | 'hayPendiente'
>

export type EnvioDeGuardado = Envio<ResultadoDeCrear>

export const MENSAJE_DE_VALIDACION = 'La hoja mandó algo que no esperábamos.'
export const RESPUESTA_PERDIDA: TextoDelAviso = {
  texto: 'No supimos si se guardó. «Guardar» lo vuelve a mandar tal como estaba.',
  salida: 'reintentar',
}
type Pendiente<P> = ReturnType<typeof usePendienteEnLaPestana<P>>

// Manda un pedido ya anotado y pone el estado con lo que vuelva: lo anota como pendiente antes de salir y lo suelta con toda respuesta que trae SQLSTATE.
function useMandar<P>({
  pendiente,
  enviar,
  avisoDe,
  alGuardar,
  setEstado,
  ocupadoRef,
}: {
  pendiente: Pendiente<P>
  enviar: (pedido: P) => Promise<EnvioDeGuardado>
  avisoDe: (envio: EnvioDeGuardado, pedido: P) => EstadoDelGuardado
  alGuardar: () => void
  setEstado: (estado: EstadoDelGuardado) => void
  ocupadoRef: RefObject<boolean>
}) {
  const alGuardarRef = useRef(alGuardar)
  useEffect(() => {
    alGuardarRef.current = alGuardar
  })
  return useCallback(
    async (pedido: P, esReenvio: boolean) => {
      pendiente.anotar(pedido)
      setEstado({ tipo: 'guardando' })
      const envio = await enviar(pedido)
      if (trasElEnvio(envio) === 'soltar') {
        pendiente.soltar()
      }
      ocupadoRef.current = false
      if (envio.ok && envio.data.tipo === 'guardada') {
        setEstado({ tipo: 'guardada', cotizacion: envio.data.cotizacion, fueReenvio: esReenvio })
        alGuardarRef.current()
        return
      }
      setEstado(avisoDe(envio, pedido))
    },
    [avisoDe, enviar, ocupadoRef, pendiente, setEstado],
  )
}

// El núcleo del guardado de una hoja (4-21), el mismo para la hoja nueva (`cotizacion_crear`) y para una guardada (`cotizacion_guardar`): el pedido se anota como **pendiente** antes
// de salir y se suelta con toda respuesta que trae SQLSTATE (`trasElEnvio`); con un pendiente vivo, «Guardar» reenvía ese pedido tal cual, sin las guardas de la hoja. Un envío a la
// vez: la marca se pone al pedir, también mientras se espera el total. Quien lo usa pone qué se manda (`enviar`), cómo se completa lo armado (`completar`: el intento nuevo) y cómo
// se ve un rechazo (`avisoDe`).
export function useNucleoDelGuardado<P, A>({
  pendiente,
  enviar,
  completar,
  avisoDe,
  alGuardar,
  olvidaLoGuardado,
}: {
  pendiente: Pendiente<P>
  enviar: (pedido: P) => Promise<EnvioDeGuardado>
  completar: (armado: A) => P
  avisoDe: (envio: EnvioDeGuardado, pedido: P) => EstadoDelGuardado
  alGuardar: () => void
  // Una guardada dice «Cambios guardados.» hasta el próximo cambio; la hoja nueva cambia de pantalla.
  olvidaLoGuardado: boolean
}) {
  const [estado, setEstado] = useState<EstadoDelGuardado>({ tipo: 'listo' })
  const ocupadoRef = useRef(false)
  const mandar = useMandar({ pendiente, enviar, avisoDe, alGuardar, setEstado, ocupadoRef })

  // Con un pendiente, ése; si no, lo que la hoja arme con el total al día.
  const guardar = useCallback(
    (armar: ArmarDe<A>) => {
      if (ocupadoRef.current) {
        return
      }
      ocupadoRef.current = true
      const anotado = pendiente.actual()
      if (anotado !== null) {
        void mandar(anotado, true)
        return
      }
      setEstado({ tipo: 'esperando_total' })
      armar((armado) => {
        if (armado === null) {
          ocupadoRef.current = false
          setEstado({ tipo: 'listo' })
          return
        }
        const { pedido, esReenvio } = queEnviar(pendiente.actual(), completar(armado))
        void mandar(pedido, esReenvio)
      })
    },
    [completar, mandar, pendiente],
  )

  // Al volver la red, el pendiente sale solo, una vez.
  const enLinea = useReintentoAlVolver(
    estado.tipo === 'aviso' ? pendiente.pendiente : null,
    async (anotado) => {
      if (ocupadoRef.current) {
        return false
      }
      ocupadoRef.current = true
      await mandar(anotado, true)
      return true
    },
  )

  const publico = {
    estado,
    enLinea,
    hayPendiente: pendiente.pendiente !== null,
    ocupado: estado.tipo === 'esperando_total' || estado.tipo === 'guardando',
    guardar,
    // Una confirmación nueva en la hoja: el aviso del último intento (y, en una guardada, el «Cambios guardados.») ya no habla de lo que se ve.
    olvidarAviso: useCallback(() => {
      setEstado((antes) =>
        antes.tipo === 'aviso' || (olvidaLoGuardado && antes.tipo === 'guardada')
          ? { tipo: 'listo' }
          : antes,
      )
    }, [olvidaLoGuardado]),
    // «Cotizar otra»: lo guardado se va, y con él el intento.
    reiniciar: useCallback(() => {
      pendiente.soltar()
      ocupadoRef.current = false
      setEstado({ tipo: 'listo' })
    }, [pendiente]),
  }
  // `mandar` y la marca de ocupado son de quien suma una salida propia (D2: «Guardar con la versión N»).
  return { publico, mandar, ocupadoRef }
}
