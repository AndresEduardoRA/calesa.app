'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_AGREGAR_VEHICULO } from '../claves'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// «Agregar vehículo» vive en la URL de la ficha del lead: sobrevive a recargar y «atrás» lo cierra.
export function usePanelAgregarVehiculo() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return {
    abierto: parametros[CLAVE_DE_PANEL] === PANEL_AGREGAR_VEHICULO,
    abrir: () => {
      void setParametros({ [CLAVE_DE_PANEL]: PANEL_AGREGAR_VEHICULO }, { history: 'push' })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null })
    },
  }
}
