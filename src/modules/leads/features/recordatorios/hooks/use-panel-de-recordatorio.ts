'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_PARA } from '../../../entities/acciones-de-fila'
import {
  CLAVE_DE_RECORDATORIO,
  PANEL_AGENDAR_RECORDATORIO,
  PANEL_EDITAR_RECORDATORIO,
} from '../../../entities/recordatorios'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_RECORDATORIO]: parseAsString,
  [CLAVE_PARA]: parseAsString,
}

// «Agendar recordatorio» (`?panel=agendar-recordatorio`) y «Editar» (`?panel=editar-recordatorio&
// recordatorio=<id>`) en la URL de la ficha: recargar los vuelve a abrir. Comparten la clave con los
// demás paneles: nunca se apilan. Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`).
export function usePanelDeRecordatorio() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  // Con `?para=` el panel es del listado (el «⋯» de una fila), no de la ficha ni del drawer.
  const panel = parametros[CLAVE_PARA] === null ? parametros[CLAVE_DE_PANEL] : null
  const agendando = panel === PANEL_AGENDAR_RECORDATORIO
  const editando =
    panel === PANEL_EDITAR_RECORDATORIO ? (parametros[CLAVE_DE_RECORDATORIO] ?? '') : null
  useVueltaDelFoco(CLAVE_DE_PANEL, agendando || editando !== null)
  return {
    agendando,
    // El id tal como vino en la URL: puede no ser de nadie.
    editando,
    abrirAgendar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_AGENDAR_RECORDATORIO, [CLAVE_DE_RECORDATORIO]: null },
            { history: 'push' },
          ),
        agendando,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_RECORDATORIO, [CLAVE_DE_RECORDATORIO]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_RECORDATORIO]: null })
    },
  }
}
