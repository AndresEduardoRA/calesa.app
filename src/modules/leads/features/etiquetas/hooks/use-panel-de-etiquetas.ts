'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_ETIQUETAS } from '../../../entities/etiqueta'

// «Gestionar etiquetas» abierto, en la URL (`?panel=etiquetas`). Comparte la clave con los demás
// paneles: abrirlo cierra el que hubiera (en el celular, la hoja de filtros), así nunca se apilan.
// Abrir suma al historial («atrás» lo cierra).
export function usePanelDeEtiquetas() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  return {
    abierto: panel === PANEL_ETIQUETAS,
    abrir: () => {
      void setPanel(PANEL_ETIQUETAS, { history: 'push' })
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
