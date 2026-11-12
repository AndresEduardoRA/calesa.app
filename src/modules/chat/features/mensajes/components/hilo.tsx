'use client'

import { useEffect, useRef, useState } from 'react'
import type { Conversacion } from '../../../entities/conversaciones'
import type { Mensaje } from '../../../entities/mensajes'
import { citaDe } from '../../../entities/reglas-del-mensaje'
import type { AccionesDelMensaje } from '../acciones-del-hilo'
import { useEdicion } from '../hooks/use-edicion'
import { useEnvio } from '../hooks/use-envio'
import { useHilo } from '../hooks/use-hilo'
import { useMarcarLeido } from '../hooks/use-marcar-leido'
import { useScrollDelHilo } from '../hooks/use-scroll-del-hilo'
import { CuerpoDelHilo } from './cuerpo-del-hilo'
import { Redactor } from './redactor'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
}

// El hilo de la conversación abierta: los mensajes y, abajo, donde se escribe. Enviar estando mirando desde una fecha vuelve a lo más reciente.
export function Hilo({ conversacion, usuarioId, zona }: Props) {
  const hilo = useHilo({ conversacion: conversacion.id, zona })
  const contenedor = useScrollDelHilo(hilo.mensajes, usuarioId)
  // El mensaje al que se está respondiendo: su cita va sobre el redactor y el foco pasa al campo.
  const [respondiendoA, setRespondiendoA] = useState<Mensaje | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (respondiendoA !== null) {
      campo.current?.focus()
    }
  }, [respondiendoA])
  const edicion = useEdicion({ reemplazar: hilo.reemplazar })
  const acciones: AccionesDelMensaje = {
    usuarioId,
    responder: setRespondiendoA,
    editandoId: edicion.editandoId,
    empezarAEditar: edicion.empezar,
    cancelarEdicion: edicion.cancelar,
    guardarEdicion: edicion.guardar,
  }
  const envio = useEnvio({
    conversacion: conversacion.id,
    usuarioId,
    agregarLocal: hilo.agregarLocal,
    resolver: hilo.resolver,
  })
  useMarcarLeido({
    conversacion: conversacion.id,
    usuarioId,
    mensajes: hilo.mensajes,
    ultimoLeidoEn: conversacion.ultimoLeidoEn,
    activo: hilo.lectura === 'listo' && hilo.desde === null,
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CuerpoDelHilo
        conversacion={conversacion}
        usuarioId={usuarioId}
        zona={zona}
        hilo={hilo}
        contenedor={contenedor}
        alReintentarEnvio={envio.reintentar}
        acciones={acciones}
      />
      {hilo.lectura === 'error' ? null : (
        <Redactor
          campo={campo}
          respondiendoA={respondiendoA ? citaDe(respondiendoA) : null}
          alQuitarRespuesta={() => {
            setRespondiendoA(null)
          }}
          alEnviar={(texto) => {
            const enviado = envio.enviar(texto, respondiendoA ?? undefined)
            if (enviado.ok) {
              setRespondiendoA(null)
              if (hilo.desde !== null) {
                void hilo.volverALoReciente()
              }
            }
            return enviado
          }}
        />
      )}
    </div>
  )
}
