'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_OTORGAR_PORTAL, PANEL_REVOCAR_PORTAL } from '../../../entities/portal'

// «Dar acceso» / «Volver a otorgar» (`?panel=otorgar-portal`) y «Revocar» (`?panel=revocar-portal`) en
// la URL de la ficha. Comparten la clave con los demás paneles: nunca se apilan. La URL nunca lleva la
// clave ni el código: sólo qué diálogo está abierto. Tras recargar, «atrás» devuelve el foco a quien lo abrió
// (`vuelta-del-foco.ts`): sólo sus señas, nunca un texto.
export function usePanelDePortal() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const otorgando = panel === PANEL_OTORGAR_PORTAL
  const revocando = panel === PANEL_REVOCAR_PORTAL
  useVueltaDelFoco(CLAVE_DE_PANEL, otorgando || revocando)
  const abre = (valor: string) => () => {
    abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(valor, { history: 'push' }), panel === valor)
  }
  const cerrar = () => {
    void setPanel(null)
  }
  return {
    otorgando,
    revocando,
    abrirOtorgar: abre(PANEL_OTORGAR_PORTAL),
    abrirRevocar: abre(PANEL_REVOCAR_PORTAL),
    cerrar,
  }
}
