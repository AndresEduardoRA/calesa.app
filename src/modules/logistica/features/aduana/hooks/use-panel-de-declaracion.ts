'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_DECLARACION,
  PANEL_EDITAR_DECLARACION,
  PANEL_NUEVA_DECLARACION,
} from '../../../entities/aduana/paneles'

// Los paneles de `/logistica/aduana` en la URL: `?panel=nueva-declaracion` y `?panel=editar-declaracion&declaracion=<id>` (el formulario), y `?declaracion=<id>` solo (el resumen).
// No conviven: abrir uno borra al otro (D8). `shallow: false` porque la declaración que se edita se lee en el servidor; abrir el formulario suma al historial («atrás» lo cierra) y
// guardar o cancelar vuelve al resumen reemplazando la entrada.
export function usePanelDeDeclaracion() {
  const [valores, escribir] = useQueryStates(
    { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_DECLARACION]: parseAsString },
    { shallow: false, history: 'push' },
  )
  const panel = valores[CLAVE_DE_PANEL]
  const abierto = panel === PANEL_NUEVA_DECLARACION || panel === PANEL_EDITAR_DECLARACION
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abrirNueva: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => escribir({ [CLAVE_DE_PANEL]: PANEL_NUEVA_DECLARACION, [CLAVE_DE_DECLARACION]: null }),
        panel === PANEL_NUEVA_DECLARACION,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => escribir({ [CLAVE_DE_PANEL]: PANEL_EDITAR_DECLARACION, [CLAVE_DE_DECLARACION]: id }),
        panel === PANEL_EDITAR_DECLARACION,
      )
    },
    // Volver al resumen de esa declaración (cancelar una edición, o guardar).
    abrirResumen: (id: string) => {
      void escribir({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_DECLARACION]: id }, { history: 'replace' })
    },
    cerrar: () => {
      void escribir({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_DECLARACION]: null })
    },
  }
}
