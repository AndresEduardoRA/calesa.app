'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// Los valores de `?panel=` que abren «Nuevo evento» y «Nueva tarea».
export const PANEL_NUEVO_EVENTO = 'nuevo-evento'
export const PANEL_NUEVA_TAREA = 'nueva-tarea'

// Los dos paneles de alta, por URL: los botones (y la tecla N) los abren y la pantalla los dibuja. Abrir no pide nada al servidor.
export function usePanelesDeAlta() {
  return {
    evento: usePanelPorUrl(PANEL_NUEVO_EVENTO),
    tarea: usePanelPorUrl(PANEL_NUEVA_TAREA),
  }
}
