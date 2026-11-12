'use client'

import type { Conversacion } from '../../../entities/conversaciones'
import { citaDe } from '../../../entities/reglas-del-mensaje'
import { usePanelesDeFicha } from '../../fichas/hooks/use-paneles-de-ficha'
import { useAccionesDelHilo } from '../hooks/use-acciones-del-hilo'
import { useEnvio } from '../hooks/use-envio'
import { useHilo } from '../hooks/use-hilo'
import { useMarcarLeido } from '../hooks/use-marcar-leido'
import { useRespuesta } from '../hooks/use-respuesta'
import { useScrollDelHilo } from '../hooks/use-scroll-del-hilo'
import { CuerpoDelHilo } from './cuerpo-del-hilo'
import { PanelesDelHilo } from './paneles-del-hilo'
import { Redactor } from './redactor'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
  puedeModerar: boolean
  // `agenda.tareas.asignar` y `agenda.eventos.publicar`: sólo deciden qué ofrecen los formularios de `/tarea` y `/evento`; la base los vuelve a exigir.
  puedeAsignar: boolean
  puedePublicar: boolean
}

// El hilo de la conversación abierta: los mensajes y, abajo, donde se escribe. Enviar estando mirando desde una fecha vuelve a lo más reciente.
export function Hilo({
  conversacion,
  usuarioId,
  zona,
  puedeModerar,
  puedeAsignar,
  puedePublicar,
}: Props) {
  const hilo = useHilo({ conversacion: conversacion.id, zona })
  const contenedor = useScrollDelHilo(hilo.mensajes, usuarioId)
  const { respondiendoA, setRespondiendoA, campo } = useRespuesta()
  const paneles = usePanelesDeFicha()
  const { acciones, borrado, mencion } = useAccionesDelHilo({
    mensajes: hilo.mensajes,
    reemplazar: hilo.reemplazar,
    cargada: hilo.lectura === 'listo',
    usuarioId,
    puedeModerar,
    responder: setRespondiendoA,
  })
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
          usuarioId={usuarioId}
          respondiendoA={respondiendoA ? citaDe(respondiendoA) : null}
          alQuitarRespuesta={() => {
            setRespondiendoA(null)
          }}
          alComando={paneles.alComando}
          alEnviar={(cuerpo, menciones) => {
            const enviado = envio.enviar(cuerpo, respondiendoA ?? undefined, menciones)
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
      <PanelesDelHilo
        conversacion={conversacion}
        usuarioId={usuarioId}
        zona={zona}
        paneles={paneles}
        mencion={mencion}
        borrado={borrado}
        puedeAsignar={puedeAsignar}
        puedePublicar={puedePublicar}
        hilo={hilo}
        campo={campo}
      />
    </div>
  )
}
