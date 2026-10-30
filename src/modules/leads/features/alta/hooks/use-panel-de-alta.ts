'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// El valor de `?panel=` que abre «Nuevo lead». Distinto de `nuevo` (el de un vehículo) y de
// `filtros`: cada pantalla tiene su `?panel=` y éste puede abrirse desde cualquiera.
export const PANEL_NUEVO_LEAD = 'nuevo-lead'

// Si «Nuevo lead» está abierto, en la URL. Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió:
// `vuelta-del-foco.ts`). Sin `shallow: false`: abrirlo no necesita al servidor.
export function usePanelDeAlta() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abierto = panel === PANEL_NUEVO_LEAD
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(PANEL_NUEVO_LEAD, { history: 'push' }), abierto)
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
