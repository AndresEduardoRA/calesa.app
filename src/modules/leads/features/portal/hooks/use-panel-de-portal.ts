'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_OTORGAR_PORTAL, PANEL_REVOCAR_PORTAL } from '../../../entities/portal'

// «Dar acceso» / «Volver a otorgar» (`?panel=otorgar-portal`) y «Revocar» (`?panel=revocar-portal`) en
// la URL de la ficha. Comparten la clave con los demás paneles: nunca se apilan. La URL nunca lleva la
// clave ni el código: sólo qué diálogo está abierto.
export function usePanelDePortal() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abre = (valor: string) => () => {
    void setPanel(valor, { history: 'push' })
  }
  const cerrar = () => {
    void setPanel(null)
  }
  return {
    otorgando: panel === PANEL_OTORGAR_PORTAL,
    revocando: panel === PANEL_REVOCAR_PORTAL,
    abrirOtorgar: abre(PANEL_OTORGAR_PORTAL),
    abrirRevocar: abre(PANEL_REVOCAR_PORTAL),
    cerrar,
  }
}
