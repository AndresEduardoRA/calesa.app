'use client'

import type { Conversacion } from '../../../entities/conversaciones'
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
      />
      {hilo.lectura === 'error' ? null : (
        <Redactor
          alEnviar={(texto) => {
            const enviado = envio.enviar(texto)
            if (enviado.ok && hilo.desde !== null) {
              void hilo.volverALoReciente()
            }
            return enviado
          }}
        />
      )}
    </div>
  )
}
