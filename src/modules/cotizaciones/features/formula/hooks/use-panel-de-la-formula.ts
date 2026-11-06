'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_PUBLICAR_FORMULA } from '../../../entities/formula/publicacion'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// Los modales de la pestaña «Fórmula», en la URL: `?panel=publicar-formula`. Abrir suma al historial («atrás» lo cierra); cerrar lo quita. Sin `shallow: false`: abrirlo
// no necesita al servidor, la pestaña ya está. Tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function usePanelDeLaFormula() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const publicando = url[CLAVE_DE_PANEL] === PANEL_PUBLICAR_FORMULA
  useVueltaDelFoco(CLAVE_DE_PANEL, publicando)
  return {
    publicando,
    abrirPublicar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_PUBLICAR_FORMULA }, { history: 'push' }),
        publicando,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null })
    },
  }
}

export type PanelDeLaFormula = ReturnType<typeof usePanelDeLaFormula>
