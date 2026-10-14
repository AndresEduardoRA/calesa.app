'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'

// El valor de `?panel=` que abre «Nuevo lead». Distinto de `nuevo` (el de un vehículo) y de
// `filtros`: cada pantalla tiene su `?panel=` y éste puede abrirse desde cualquiera.
export const PANEL_NUEVO_LEAD = 'nuevo-lead'

// Si «Nuevo lead» está abierto, en la URL. Abrir suma al historial («atrás» lo cierra). Sin
// `shallow: false`: abrirlo no necesita al servidor.
export function usePanelDeAlta() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  return {
    abierto: panel === PANEL_NUEVO_LEAD,
    abrir: () => {
      void setPanel(PANEL_NUEVO_LEAD, { history: 'push' })
    },
    cerrar: () => {
      void setPanel(null)
    },
  }
}
