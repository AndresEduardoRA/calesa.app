'use client'

import { MessageSquareIcon } from 'lucide-react'
import type { Conversacion } from '../../../entities/conversaciones'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { RefObject } from 'react'
import type { useHilo } from '../hooks/use-hilo'
import { ListaDelHilo } from './lista-del-hilo'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
  hilo: ReturnType<typeof useHilo>
  contenedor: RefObject<HTMLDivElement | null>
  alReintentarEnvio: (id: string) => void
}

// Los mensajes de la conversación abierta, con su scroll propio. Cargando reserva el alto con un esqueleto; si falla dice «Reintentar»; sin
// mensajes invita a escribir el primero.
export function CuerpoDelHilo({
  conversacion,
  usuarioId,
  zona,
  hilo,
  contenedor,
  alReintentarEnvio,
}: Props) {
  if (hilo.lectura === 'cargando') {
    return (
      <div aria-busy="true" className="grid min-h-0 flex-1 content-start gap-3 p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/2" />
        <Skeleton className="h-10 w-3/5" />
      </div>
    )
  }
  if (hilo.lectura === 'error') {
    return (
      <div className="min-h-0 flex-1">
        <EstadoError
          alReintentar={hilo.reintentar}
          titulo="No pudimos cargar los mensajes"
          {...(hilo.errorDeLectura ? { descripcion: hilo.errorDeLectura.mensaje } : {})}
        />
      </div>
    )
  }
  return (
    <div ref={contenedor} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {hilo.mensajes.length === 0 ? (
        <EstadoVacio
          Icono={MessageSquareIcon}
          titulo="Escribe el primero"
          descripcion="Aún no hay mensajes en esta conversación."
        />
      ) : (
        <ListaDelHilo
          mensajes={hilo.mensajes}
          usuarioId={usuarioId}
          mostrarAutor={conversacion.tipo !== 'directa'}
          zona={zona}
          hayAnteriores={hilo.hayAnteriores}
          enElTope={hilo.enElTope}
          cargandoAnteriores={hilo.cargandoAnteriores}
          errorAlCargarAnteriores={hilo.errorAlCargarAnteriores}
          desde={hilo.desde}
          verAnteriores={() => {
            void hilo.verAnteriores()
          }}
          irAUnaFecha={(dia) => {
            void hilo.irAUnaFecha(dia)
          }}
          volverALoReciente={() => {
            void hilo.volverALoReciente()
          }}
          alReintentar={alReintentarEnvio}
        />
      )}
    </div>
  )
}
