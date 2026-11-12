'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback, useRef } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { citaDe } from '../../../entities/reglas-del-mensaje'
import {
  mensajeLocal,
  textoValido,
  type Mensaje,
  type ResultadoDelEnvio,
  type TextoValido,
} from '../../../entities/mensajes'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { enviarMensaje } from '../actions/enviar-mensaje'

type Props = {
  conversacion: string
  usuarioId: string
  agregarLocal: (mensaje: Mensaje) => void
  resolver: (id: string, resultado: ResultadoDelEnvio) => void
}

type Pendiente = { cuerpo: string; respondeA?: string }

// El envío optimista: el mensaje se ve apenas se escribe, con el `id` del navegador. Si no llega, queda «No enviado» y reintentar reusa **el mismo
// `id`, el mismo cuerpo y el mismo mensaje respondido** (la base responde `repetido`: nunca se duplica). Los envíos van de a uno, en el orden en que se escribieron.
export function useEnvio({ conversacion, usuarioId, agregarLocal, resolver }: Props) {
  const accion = useAction(enviarMensaje)
  const cuerpos = useRef(new Map<string, Pendiente>())
  const enCurso = useRef(new Set<string>())
  const cola = useRef<Promise<void>>(Promise.resolve())

  const ejecutar = useCallback(
    async (id: string, { cuerpo, respondeA }: Pendiente) => {
      const envio = await enviarAccion(
        accion.executeAsync({ id, conversacion, cuerpo, ...(respondeA ? { respondeA } : {}) }),
        MENSAJE_DE_VALIDACION,
      )
      enCurso.current.delete(id)
      if (envio.ok) {
        cuerpos.current.delete(id)
        resolver(id, { estado: 'enviado', creadoEn: envio.data.creadoEn })
      } else {
        resolver(id, { estado: 'fallido', motivo: envio.error.mensaje })
      }
    },
    [accion, conversacion, resolver],
  )

  const encolar = useCallback(
    (id: string, pendiente: Pendiente) => {
      enCurso.current.add(id)
      cola.current = cola.current.then(() => ejecutar(id, pendiente))
    },
    [ejecutar],
  )

  // Vacío no envía; demasiado largo lo dice quien dibuja el redactor. `responde` es el mensaje al que se contesta.
  const enviar = useCallback(
    (texto: string, responde?: Mensaje): TextoValido => {
      const valido = textoValido(texto)
      if (!valido.ok) {
        return valido
      }
      const id = crypto.randomUUID()
      const pendiente: Pendiente = {
        cuerpo: valido.cuerpo,
        ...(responde ? { respondeA: responde.id } : {}),
      }
      cuerpos.current.set(id, pendiente)
      agregarLocal(
        mensajeLocal({
          id,
          conversacion,
          cuerpo: valido.cuerpo,
          yo: usuarioId,
          nombre: null,
          ahora: new Date().toISOString(),
          ...(responde ? { responde: citaDe(responde) } : {}),
        }),
      )
      encolar(id, pendiente)
      return valido
    },
    [agregarLocal, conversacion, encolar, usuarioId],
  )

  const reintentar = useCallback(
    (id: string) => {
      const pendiente = cuerpos.current.get(id)
      if (pendiente === undefined || enCurso.current.has(id)) {
        return
      }
      resolver(id, { estado: 'enviando' })
      encolar(id, pendiente)
    },
    [encolar, resolver],
  )

  return { enviar, reintentar }
}
