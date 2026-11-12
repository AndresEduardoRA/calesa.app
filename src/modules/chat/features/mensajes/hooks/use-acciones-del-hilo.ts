'use client'

import type { Mensaje } from '../../../entities/mensajes'
import { useFichasDelHilo } from '../../fichas/hooks/use-fichas-del-hilo'
import { useMencionesDelHilo } from '../../menciones/hooks/use-menciones-del-hilo'
import type { AccionesDelMensaje } from '../acciones-del-hilo'
import { useBorradoPorUrl } from './use-borrado-por-url'
import { useEdicion } from './use-edicion'

type Props = {
  mensajes: readonly Mensaje[]
  reemplazar: (id: string, cambios: Partial<Mensaje>) => void
  cargada: boolean
  usuarioId: string
  puedeModerar: boolean
  responder: (mensaje: Mensaje) => void
}

// Lo que el hilo le da a cada burbuja para actuar sobre su mensaje (editar, borrar, responder), lo que menciona y su ficha de tarea o de evento. Devuelve
// además el borrado y la mención abierta, que el hilo dibuja aparte.
export function useAccionesDelHilo({
  mensajes,
  reemplazar,
  cargada,
  usuarioId,
  puedeModerar,
  responder,
}: Props) {
  const edicion = useEdicion({ reemplazar })
  const borrado = useBorradoPorUrl({ mensajes, usuarioId, puedeModerar, cargada })
  const mencion = useMencionesDelHilo(mensajes)
  const fichas = useFichasDelHilo(mensajes)
  const acciones: AccionesDelMensaje = {
    usuarioId,
    puedeModerar,
    responder,
    editandoId: edicion.editandoId,
    empezarAEditar: edicion.empezar,
    cancelarEdicion: edicion.cancelar,
    pedirBorrado: borrado.abrir,
    guardarEdicion: edicion.guardar,
    menciones: mencion.menciones,
    fichas,
  }
  return { acciones, borrado, mencion }
}
