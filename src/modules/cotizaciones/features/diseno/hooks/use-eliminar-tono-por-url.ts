'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_TONO,
  PANEL_ELIMINAR_TONO,
  motivoParaNoEliminarTono,
  tonoPorId,
} from '../../../entities/diseno/panel-de-tonos'
import type { Tono } from '../../../entities/diseno/tonos'

// La confirmación de «Eliminar» un tono, en la URL (`?panel=eliminar-tono&tono=<id>`): se puede recargar y «atrás» la cierra. Se monta una vez en la lista, no una
// por fila. Un tono que ya no está no abre (se dice y la URL se limpia, escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarTonoPorUrl(tonos: readonly Tono[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_TONO, [CLAVE_DE_TONO])
  const id = url.valor(CLAVE_DE_TONO)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoEliminarTono(tonos, id) : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? tonoPorId(tonos, id) : null
  const tono = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    tono,
    abrir: (tonoId: string) => {
      url.abrir({ [CLAVE_DE_TONO]: tonoId })
    },
    cerrar: url.cerrar,
  }
}
