'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_SEGUIMIENTO,
  PANEL_ANOTAR_SEGUIMIENTO,
  PANEL_EDITAR_SEGUIMIENTO,
} from '../../../entities/edicion-de-seguimiento'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_SEGUIMIENTO]: parseAsString }

// «Anotar seguimiento» (`?panel=anotar-seguimiento`) y «Editar» (`?panel=editar-seguimiento&
// seguimiento=<id>`) en la URL: recargar los vuelve a abrir. Comparten la clave con los demás
// paneles: nunca se apilan. Abrir suma al historial («atrás» lo cierra).
export function usePanelDeSeguimiento() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  return {
    anotando: panel === PANEL_ANOTAR_SEGUIMIENTO,
    // El id tal como vino en la URL: puede no ser de nadie.
    editando: panel === PANEL_EDITAR_SEGUIMIENTO ? (parametros[CLAVE_DE_SEGUIMIENTO] ?? '') : null,
    abrirAnotar: () => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_ANOTAR_SEGUIMIENTO, [CLAVE_DE_SEGUIMIENTO]: null },
        { history: 'push' },
      )
    },
    abrirEdicion: (id: string) => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_EDITAR_SEGUIMIENTO, [CLAVE_DE_SEGUIMIENTO]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_SEGUIMIENTO]: null })
    },
  }
}
