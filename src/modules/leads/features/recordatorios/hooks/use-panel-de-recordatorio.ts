'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_RECORDATORIO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_EDITAR_RECORDATORIO,
} from '../../../entities/recordatorios'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_RECORDATORIO]: parseAsString }

// «Agendar recordatorio» (`?panel=agendar-recordatorio`) y «Editar» (`?panel=editar-recordatorio&
// recordatorio=<id>`) en la URL de la ficha: recargar los vuelve a abrir. Comparten la clave con los
// demás paneles: nunca se apilan. Abrir suma al historial («atrás» lo cierra).
export function usePanelDeRecordatorio() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  return {
    agendando: panel === PANEL_AGENDAR_RECORDATORIO,
    // El id tal como vino en la URL: puede no ser de nadie.
    editando:
      panel === PANEL_EDITAR_RECORDATORIO ? (parametros[CLAVE_DE_RECORDATORIO] ?? '') : null,
    abrirAgendar: () => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_AGENDAR_RECORDATORIO, [CLAVE_DE_RECORDATORIO]: null },
        { history: 'push' },
      )
    },
    abrirEdicion: (id: string) => {
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_EDITAR_RECORDATORIO, [CLAVE_DE_RECORDATORIO]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_RECORDATORIO]: null })
    },
  }
}
