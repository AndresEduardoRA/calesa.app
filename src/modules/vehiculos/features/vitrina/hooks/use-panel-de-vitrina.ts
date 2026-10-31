'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_DE_VITRINA } from '../claves'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// El panel de publicar vive en la URL de la ficha (`?panel=vitrina`): sobrevive a recargar y
// «atrás» lo cierra (tras recargar, devuelve el foco al «⋯» que lo abrió: `vuelta-del-foco.ts`).
export function usePanelDeVitrina() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const abierto = parametros[CLAVE_DE_PANEL] === PANEL_DE_VITRINA
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setParametros({ [CLAVE_DE_PANEL]: PANEL_DE_VITRINA }, { history: 'push' }),
        abierto,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null })
    },
  }
}
