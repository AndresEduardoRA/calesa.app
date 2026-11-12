'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// `?eliminar=guia`: el diálogo de «Eliminar guía» vive en su propia clave y deja el resto de la URL intacto.
export const PANEL_ELIMINAR_GUIA = 'guia'

export function useEliminarGuiaPorUrl() {
  return usePanelPorUrl(PANEL_ELIMINAR_GUIA, [], { clave: 'eliminar' })
}
