'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_OPORTUNIDAD,
  PANEL_EDITAR_OPORTUNIDAD,
  PANEL_NUEVA_OPORTUNIDAD,
} from '../../../entities/oportunidad'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_OPORTUNIDAD]: parseAsString }

// «Nueva oportunidad» (`?panel=nueva-oportunidad`) y «Editar» (`?panel=editar-oportunidad&oportunidad=<id>`)
// en la URL de la ficha. Comparten la clave con los demás paneles: nunca se apilan. Abrir suma al historial (tras recargar, «atrás» devuelve el foco a
// quien lo abrió: `vuelta-del-foco.ts`).
export function usePanelDeOportunidad() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  const nueva = panel === PANEL_NUEVA_OPORTUNIDAD
  const editando = panel === PANEL_EDITAR_OPORTUNIDAD ? parametros[CLAVE_DE_OPORTUNIDAD] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nueva || panel === PANEL_EDITAR_OPORTUNIDAD)
  return {
    nueva,
    editando,
    abrirNueva: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_NUEVA_OPORTUNIDAD, [CLAVE_DE_OPORTUNIDAD]: null },
            { history: 'push' },
          ),
        nueva,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_OPORTUNIDAD, [CLAVE_DE_OPORTUNIDAD]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_OPORTUNIDAD]: null })
    },
  }
}
