'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

import { CLAVE_DE_EDICION, PANEL_NUEVO } from '../claves'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_EDICION]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

// Qué panel del inventario está abierto, en la URL: `?panel=nuevo` o `?editar=<id>`. Abrir suma
// al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`). `shallow: false`: para editar, el
// servidor trae el vehículo. Se llama en cada fila del inventario: la vuelta es un ref y dos efectos por clave, que corren al abrir o cerrar.
export function usePanelDeVehiculo() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const nuevoAbierto = parametros[CLAVE_DE_PANEL] === PANEL_NUEVO
  const enEdicion = parametros[CLAVE_DE_EDICION]
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevoAbierto)
  useVueltaDelFoco(CLAVE_DE_EDICION, enEdicion !== null)
  return {
    nuevoAbierto,
    enEdicion,
    abrirNuevo: () => {
      recordarQuienAbre()
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            { [CLAVE_DE_PANEL]: PANEL_NUEVO, [CLAVE_DE_EDICION]: null },
            { history: 'push' },
          ),
        nuevoAbierto,
      )
    },
    editar: (id: string) => {
      recordarQuienAbre()
      abrirConVuelta(
        CLAVE_DE_EDICION,
        () =>
          setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_EDICION]: id }, { history: 'push' }),
        enEdicion === id,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_EDICION]: null })
    },
    // Después de un alta: lo nuevo está en la primera página.
    cerrarYVolverAlPrincipio: () => {
      void setParametros({
        [CLAVE_DE_PANEL]: null,
        [CLAVE_DE_EDICION]: null,
        [CLAVE_DE_CURSOR]: null,
      })
    },
  }
}
