'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { Mensaje } from '../../../entities/mensajes'
import { motivoParaNoBorrar } from '../../../entities/reglas-del-mensaje'

// `?panel=borrar-mensaje&mensaje=<id>` sobre la conversación abierta: no nombra `c`, abrirlo o cerrarlo no toca `?c=`.
export const PANEL_BORRAR_MENSAJE = 'borrar-mensaje'
export const CLAVE_DE_MENSAJE = 'mensaje'

type Props = {
  mensajes: readonly Mensaje[]
  usuarioId: string
  puedeModerar: boolean
  // El hilo ya leyó su primera página: sin eso, «no está entre los cargados» sería un falso rechazo.
  cargada: boolean
}

// Qué mensaje se borra, en la URL: se puede recargar y «atrás» lo cierra. Una URL que no abre (el mensaje no está entre los cargados o ya no se
// puede borrar) avisa y se limpia. Se revisa una vez, con la primera página ya leída.
export function useBorradoPorUrl({ mensajes, usuarioId, puedeModerar, cargada }: Props) {
  const url = usePanelPorUrl(PANEL_BORRAR_MENSAJE, [CLAVE_DE_MENSAJE])
  const id = url.valor(CLAVE_DE_MENSAJE)
  const apertura = useApertura(url.abierto)
  const encontrado = id === null ? null : (mensajes.find((m) => m.id === id) ?? null)
  const revisar = url.abierto && cargada
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar ? motivoParaNoBorrar(encontrado, usuarioId, puedeModerar) : null,
    url.cerrar,
  )
  return {
    mensaje: revisar && !rechazada ? encontrado : null,
    abrir: (mensajeId: string) => {
      url.abrir({ [CLAVE_DE_MENSAJE]: mensajeId })
    },
    cerrar: url.cerrar,
  }
}
