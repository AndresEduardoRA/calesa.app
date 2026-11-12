'use client'

import type { Conversacion } from '../../../entities/conversaciones'
import type { RefObject } from 'react'
import { PanelesDeFicha } from '../../fichas/components/paneles-de-ficha'
import type { usePanelesDeFicha } from '../../fichas/hooks/use-paneles-de-ficha'
import { MencionAbierta } from '../../menciones/components/mencion-abierta'
import type { useHilo } from '../hooks/use-hilo'
import type { useBorradoPorUrl } from '../hooks/use-borrado-por-url'
import type { useAccionesDelHilo } from '../hooks/use-acciones-del-hilo'
import { ConfirmarBorrado } from './confirmar-borrado'

type Props = {
  conversacion: Conversacion
  usuarioId: string
  zona: string
  paneles: ReturnType<typeof usePanelesDeFicha>
  mencion: ReturnType<typeof useAccionesDelHilo>['mencion']
  borrado: ReturnType<typeof useBorradoPorUrl>
  puedeAsignar: boolean
  puedePublicar: boolean
  hilo: ReturnType<typeof useHilo>
  // Tras crear una tarea o un evento el foco vuelve al campo.
  campo: RefObject<HTMLTextAreaElement | null>
}

// Lo que se abre sobre el hilo por la URL: los formularios de `/tarea` y `/evento`, la mención abierta y la pregunta de borrar un mensaje.
export function PanelesDelHilo({
  conversacion,
  usuarioId,
  zona,
  paneles,
  mencion,
  borrado,
  puedeAsignar,
  puedePublicar,
  hilo,
  campo,
}: Props) {
  return (
    <>
      <PanelesDeFicha
        conversacion={conversacion}
        usuarioId={usuarioId}
        zona={zona}
        paneles={paneles}
        puedeAsignar={puedeAsignar}
        puedePublicar={puedePublicar}
        alCrear={() => {
          void hilo.releer()
          campo.current?.focus()
        }}
      />
      <MencionAbierta mencion={mencion} />
      <ConfirmarBorrado
        objetivo={borrado.mensaje}
        usuarioId={usuarioId}
        alBorrar={hilo.reemplazar}
        alCerrar={borrado.cerrar}
      />
    </>
  )
}
