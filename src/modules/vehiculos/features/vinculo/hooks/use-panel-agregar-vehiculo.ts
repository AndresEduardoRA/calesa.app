'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_AGREGAR_VEHICULO } from '../claves'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// «Agregar vehículo» vive en la URL de la ficha del lead: sobrevive a recargar y «atrás» lo cierra
// (tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`).
export function usePanelAgregarVehiculo() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const abierto = parametros[CLAVE_DE_PANEL] === PANEL_AGREGAR_VEHICULO
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    abrir: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setParametros({ [CLAVE_DE_PANEL]: PANEL_AGREGAR_VEHICULO }, { history: 'push' }),
        abierto,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null })
    },
  }
}
