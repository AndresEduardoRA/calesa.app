'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'

// Si la edición de la ficha está abierta, en la URL (`?panel=editar-lead`). Abrir suma al historial
// («atrás» lo cierra). Sin `shallow: false`: abrirlo no necesita al servidor, la ficha ya está.
export function usePanelDeLead() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  return {
    abierto: panel === PANEL_EDITAR_LEAD,
    abrir: () => {
      void setPanel(PANEL_EDITAR_LEAD, { history: 'push' })
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
