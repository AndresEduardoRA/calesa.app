'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  CLAVE_DE_COMENTARIO,
  motivoParaNoBorrar,
  PANEL_BORRAR_COMENTARIO,
} from '../../../entities/comentarios/borrado'
import { buscarComentario, type ListaDeComentarios } from '../../../entities/comentarios/lista'

// Qué comentario se borra, en la URL de la guardada (`?panel=borrar-comentario&comentario=<id>`): se puede recargar, «atrás» lo cierra, y una URL que no abre
// (el comentario no está entre los cargados o ya no se puede borrar) avisa y se limpia. Se revisa una vez, con la primera página ya leída.
export function useBorradoPorUrl(
  lista: ListaDeComentarios,
  cargada: boolean,
  puedeModerar: boolean,
) {
  const url = usePanelPorUrl(PANEL_BORRAR_COMENTARIO, [CLAVE_DE_COMENTARIO])
  const id = url.valor(CLAVE_DE_COMENTARIO)
  const apertura = useApertura(url.abierto)
  const encontrado = id === null ? null : buscarComentario(lista, id)
  const revisar = url.abierto && cargada
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar ? motivoParaNoBorrar(encontrado, puedeModerar) : null,
    url.cerrar,
  )
  const abre = revisar && !rechazada && encontrado !== null
  return {
    // Estables entre renders (salen de la lista cargada): el diálogo los recuerda mientras se cierra.
    comentario: abre ? encontrado.comentario : null,
    // Si lo que se borra es una raíz, ella (para decir si sus respuestas quedan).
    comoRaiz: abre && encontrado.esRaiz ? encontrado.raiz : null,
    abrir: (comentarioId: string) => {
      url.abrir({ [CLAVE_DE_COMENTARIO]: comentarioId })
    },
    cerrar: url.cerrar,
  }
}
