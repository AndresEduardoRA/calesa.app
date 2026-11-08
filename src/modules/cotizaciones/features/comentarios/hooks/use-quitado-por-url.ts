'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { puedeQuitarAdjunto, type Adjunto } from '../../../entities/comentarios/adjunto'
import {
  CLAVE_DE_ADJUNTO,
  MENSAJE_ADJUNTO_YA_NO_ESTA,
  PANEL_QUITAR_ADJUNTO,
} from '../../../entities/comentarios/quitado'

// Qué adjunto se quita, en la URL de la guardada (`?panel=quitar-adjunto&adjunto=<id>`): se puede recargar, «atrás» lo cierra, y una URL que no abre (el adjunto no
// está o ya no se puede quitar) avisa y se limpia. Se revisa una vez, con la lista ya leída.
export function useQuitadoPorUrl(
  lista: readonly Adjunto[],
  cargada: boolean,
  quien: { puedeAdjuntar: boolean; puedeModerar: boolean },
) {
  const url = usePanelPorUrl(PANEL_QUITAR_ADJUNTO, [CLAVE_DE_ADJUNTO])
  const id = url.valor(CLAVE_DE_ADJUNTO)
  const apertura = useApertura(url.abierto)
  const encontrado = id === null ? null : (lista.find((a) => a.id === id) ?? null)
  const revisar = url.abierto && cargada
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar && !(encontrado && puedeQuitarAdjunto(encontrado, quien))
      ? MENSAJE_ADJUNTO_YA_NO_ESTA
      : null,
    url.cerrar,
  )
  return {
    adjunto: revisar && !rechazada ? encontrado : null,
    abrir: (adjuntoId: string) => {
      url.abrir({ [CLAVE_DE_ADJUNTO]: adjuntoId })
    },
    cerrar: url.cerrar,
  }
}
