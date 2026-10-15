'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_OPORTUNIDAD,
  PANEL_EDITAR_OPORTUNIDAD,
  PANEL_NUEVA_OPORTUNIDAD,
} from '../../../entities/oportunidad'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_OPORTUNIDAD]: parseAsString }

// «Nueva oportunidad» (`?panel=nueva-oportunidad`) y «Editar» (`?panel=editar-oportunidad&oportunidad=<id>`)
// en la URL de la ficha. Comparten la clave con los demás paneles: nunca se apilan. Abrir suma al historial.
export function usePanelDeOportunidad() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  return {
    nueva: panel === PANEL_NUEVA_OPORTUNIDAD,
    editando: panel === PANEL_EDITAR_OPORTUNIDAD ? parametros[CLAVE_DE_OPORTUNIDAD] : null,
    abrirNueva: () => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_NUEVA_OPORTUNIDAD, [CLAVE_DE_OPORTUNIDAD]: null },
        { history: 'push' },
      )
    },
    abrirEdicion: (id: string) => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_EDITAR_OPORTUNIDAD, [CLAVE_DE_OPORTUNIDAD]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_OPORTUNIDAD]: null })
    },
  }
}
