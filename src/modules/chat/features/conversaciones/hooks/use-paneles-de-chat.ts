'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// Los paneles de la lista, por URL. Sin claves nombradas: abrir o cerrar uno no toca `?c=` (con `claves: ['c']`, cerrar cerraría el hilo).
export const PANEL_NUEVA_CONVERSACION = 'nueva'
export const PANEL_NUEVO_GRUPO = 'grupo'

export const usePanelDeDirecta = () => usePanelPorUrl(PANEL_NUEVA_CONVERSACION)
export const usePanelDeGrupo = () => usePanelPorUrl(PANEL_NUEVO_GRUPO)
