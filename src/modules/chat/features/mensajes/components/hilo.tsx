'use client'

import type { Conversacion } from '../../../entities/conversaciones'
import { citaDe } from '../../../entities/reglas-del-mensaje'
import type { AccionesDelMensaje } from '../acciones-del-hilo'
import { MencionAbierta } from '../../menciones/components/mencion-abierta'
import { useMencionesDelHilo } from '../../menciones/hooks/use-menciones-del-hilo'
import { useBorradoPorUrl } from '../hooks/use-borrado-por-url'
import { useEdicion } from '../hooks/use-edicion'
import { useEnvio } from '../hooks/use-envio'
import { useHilo } from '../hooks/use-hilo'
import { useMarcarLeido } from '../hooks/use-marcar-leido'
import { useRespuesta } from '../hooks/use-respuesta'
import { useScrollDelHilo } from '../hooks/use-scroll-del-hilo'
import { ConfirmarBorrado } from './confirmar-borrado'
import { CuerpoDelHilo } from './cuerpo-del-hilo'
import { Redactor } from './redactor'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
  puedeModerar: boolean
}

// El hilo de la conversación abierta: los mensajes y, abajo, donde se escribe. Enviar estando mirando desde una fecha vuelve a lo más reciente.
export function Hilo({ conversacion, usuarioId, zona, puedeModerar }: Props) {
  const hilo = useHilo({ conversacion: conversacion.id, zona })
  const contenedor = useScrollDelHilo(hilo.mensajes, usuarioId)
  const { respondiendoA, setRespondiendoA, campo } = useRespuesta()
  const edicion = useEdicion({ reemplazar: hilo.reemplazar })
  const borrado = useBorradoPorUrl({
    mensajes: hilo.mensajes,
    usuarioId,
    puedeModerar,
    cargada: hilo.lectura === 'listo',
  })
  const mencion = useMencionesDelHilo(hilo.mensajes)
  const acciones: AccionesDelMensaje = {
    usuarioId,
    puedeModerar,
    responder: setRespondiendoA,
    editandoId: edicion.editandoId,
    empezarAEditar: edicion.empezar,
    cancelarEdicion: edicion.cancelar,
    pedirBorrado: borrado.abrir,
    guardarEdicion: edicion.guardar,
    menciones: mencion.menciones,
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
      <MencionAbierta mencion={mencion} />
      <ConfirmarBorrado
        objetivo={borrado.mensaje}
        usuarioId={usuarioId}
        alBorrar={hilo.reemplazar}
        alCerrar={borrado.cerrar}
      />
    </div>
  )
}
