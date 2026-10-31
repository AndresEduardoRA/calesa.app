'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_ETIQUETAS } from '../../../entities/etiqueta'

// «Gestionar etiquetas» abierto, en la URL (`?panel=etiquetas`). Comparte la clave con los demás
// paneles: abrirlo cierra el que hubiera (en el celular, la hoja de filtros), así nunca se apilan.
// Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió).
export function usePanelDeEtiquetas() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abierto = panel === PANEL_ETIQUETAS
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(PANEL_ETIQUETAS, { history: 'push' }), abierto)
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
