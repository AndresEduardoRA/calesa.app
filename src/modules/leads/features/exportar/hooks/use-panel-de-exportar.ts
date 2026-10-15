'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_EXPORTAR } from '../../../entities/exportacion'

// La exportación abierta, en la URL (`?panel=exportar`). Comparte la clave con los demás paneles:
// abrirla cierra el que hubiera, así nunca se apilan. Abrir suma al historial.
export function usePanelDeExportar() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  return {
    abierto: panel === PANEL_EXPORTAR,
    abrir: () => {
      void setPanel(PANEL_EXPORTAR, { history: 'push' })
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
