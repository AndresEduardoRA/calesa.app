'use client'

import { useRouter } from 'next/navigation'
import type { Referencia } from '../../../entities/menciones'
import type { Conversacion } from '../../../entities/conversaciones'
import { useFichasDelHilo } from '../../fichas/hooks/use-fichas-del-hilo'
import { useReferenciasDelHilo } from '../../menciones/hooks/use-referencias-del-hilo'
import type { AccionesDelMensaje } from '../../mensajes/acciones-del-hilo'
import { CuerpoDelHilo } from '../../mensajes/components/cuerpo-del-hilo'
import { Redactor } from '../../mensajes/components/redactor'
import { useEnvio } from '../../mensajes/hooks/use-envio'
import { useHilo } from '../../mensajes/hooks/use-hilo'
import { useMarcarLeido } from '../../mensajes/hooks/use-marcar-leido'
import { useRespuesta } from '../../mensajes/hooks/use-respuesta'
import { useScrollDelHilo } from '../../mensajes/hooks/use-scroll-del-hilo'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
  puedeModerar: boolean
}

// El hilo dentro del panel del widget: leer y responder. Compone las piezas del hilo de `/chat` **sin** `?panel=`, `?mencion=` ni el borrado por URL (el
// widget flota sobre otra pantalla y no le cambia la URL). Editar, borrar, responder con cita, `/tarea` y `/evento` viven en `/chat`: el
// «⋯» no se dibuja, lo que se menciona abre `/chat` y un comando navega allí con su formulario.
export function HiloDelWidget({ conversacion, usuarioId, zona, puedeModerar }: Props) {
  const router = useRouter()
  const hilo = useHilo({ conversacion: conversacion.id, zona })
  const contenedor = useScrollDelHilo(hilo.mensajes, usuarioId)
  const { campo } = useRespuesta()
  const referencias = useReferenciasDelHilo({ mensajes: hilo.mensajes })
  const fichas = useFichasDelHilo(hilo.mensajes)
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
  const acciones: AccionesDelMensaje = {
    usuarioId,
    sinMenu: true,
    puedeModerar,
    responder: () => undefined,
    editandoId: null,
    empezarAEditar: () => undefined,
    cancelarEdicion: () => undefined,
    pedirBorrado: () => undefined,
    guardarEdicion: () => Promise.resolve({ ok: false, mensaje: '' }),
    menciones: {
      estadoDe: referencias.estadoDe,
      reintentar: referencias.reintentar,
      abrir: (referencia: Referencia) => {
        router.push(`/chat?c=${conversacion.id}&mencion=${referencia.clase}:${referencia.id}`)
      },
    },
    fichas,
  }
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
          respondiendoA={null}
          alQuitarRespuesta={() => undefined}
          alComando={(comando) => {
            router.push(`/chat?c=${conversacion.id}&panel=${comando}`)
          }}
          alEnviar={(cuerpo, menciones) => {
            const enviado = envio.enviar(cuerpo, undefined, menciones)
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
