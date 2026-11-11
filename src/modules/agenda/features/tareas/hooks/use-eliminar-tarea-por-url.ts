'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// `?eliminar=tarea`: el diálogo de «Eliminar tarea» vive en su propia clave y deja `?tarea=<id>` intacto.
export const PANEL_ELIMINAR_TAREA = 'tarea'

export function useEliminarTareaPorUrl() {
  return usePanelPorUrl(PANEL_ELIMINAR_TAREA, [], { clave: 'eliminar' })
}
