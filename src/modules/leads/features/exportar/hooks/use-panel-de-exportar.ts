'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_EXPORTAR } from '../../../entities/exportacion'

// La exportación abierta, en la URL (`?panel=exportar`). Comparte la clave con los demás paneles:
// abrirla cierra el que hubiera, así nunca se apilan. Abrir suma al historial (tras recargar, «atrás» devuelve el foco a quien la abrió).
export function usePanelDeExportar() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abierto = panel === PANEL_EXPORTAR
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(PANEL_EXPORTAR, { history: 'push' }), abierto)
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
