'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// `?eliminar=evento`: el diálogo de «Eliminar evento» vive en su propia clave y deja `?evento=<id>` intacto.
export const PANEL_ELIMINAR_EVENTO = 'evento'

export function useEliminarEventoPorUrl() {
  return usePanelPorUrl(PANEL_ELIMINAR_EVENTO, [], { clave: 'eliminar' })
}
