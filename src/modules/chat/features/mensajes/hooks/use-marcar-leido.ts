'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ultimoDeOtro, type Mensaje } from '../../../entities/mensajes'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { marcarLeido } from '../actions/marcar-leido'

type Props = {
  conversacion: string
  usuarioId: string
  mensajes: readonly Mensaje[]
  // Hasta cuándo ya había leído al abrir.
  ultimoLeidoEn: string | null
  // El hilo está en lo reciente (no mirando desde una fecha) y ya cargó.
  activo: boolean
}

// Marca leído lo que se ve: con el hilo en lo reciente y la pestaña visible, el último mensaje de otra persona posterior a lo ya marcado se manda
// a `chat_leer` una vez por cambio. Enviar un mensaje propio no mueve la lectura. Un fallo no se dice y no adelanta lo marcado: el siguiente
// cambio lo reintenta.
export function useMarcarLeido({
  conversacion,
  usuarioId,
  mensajes,
  ultimoLeidoEn,
  activo,
}: Props) {
  const accion = useAction(marcarLeido)
  const marcado = useRef(ultimoLeidoEn ? Date.parse(ultimoLeidoEn) : 0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const alCambiar = () => {
      setVisible(document.visibilityState === 'visible')
    }
    alCambiar()
    document.addEventListener('visibilitychange', alCambiar)
    return () => {
      document.removeEventListener('visibilitychange', alCambiar)
    }
  }, [])

  const ultimo = ultimoDeOtro(mensajes, usuarioId)
  const hasta = ultimo?.creadoEn ?? null

  useEffect(() => {
    if (!activo || !visible || hasta === null) {
      return
    }
    const instante = Date.parse(hasta)
    if (instante <= marcado.current) {
      return
    }
    const anterior = marcado.current
    marcado.current = instante
    void enviarAccion(accion.executeAsync({ conversacion, hasta }), MENSAJE_DE_VALIDACION).then(
      (envio) => {
        if (!envio.ok && marcado.current === instante) {
          marcado.current = anterior
        }
      },
    )
  }, [accion, activo, conversacion, hasta, visible])
}
