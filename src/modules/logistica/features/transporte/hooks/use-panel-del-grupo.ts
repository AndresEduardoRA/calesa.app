'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_EDITAR_GRUPO } from '../../../entities/transporte/paneles'

// «Editar grupo» en la URL: `?panel=editar-grupo` junto al `?booking=` o `?contenedor=` que ya abre el resumen (`claveDeUrl`, que pone `src/app`). El formulario **tapa** al resumen (D36): abrirlo
// suma al historial («atrás» lo cierra) y guardar o cancelar vuelve al resumen reemplazando la entrada. `shallow: false` porque la página lee el grupo que se edita. Filtros y cursor no se tocan.
export function usePanelDelGrupo(claveDeUrl: string) {
  const [valores, escribir] = useQueryStates(
    { [CLAVE_DE_PANEL]: parseAsString, [claveDeUrl]: parseAsString },
    { shallow: false, history: 'push' },
  )
  const panel = valores[CLAVE_DE_PANEL]
  useVueltaDelFoco(CLAVE_DE_PANEL, panel === PANEL_EDITAR_GRUPO)
  return {
    abrirEdicion: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => escribir({ [CLAVE_DE_PANEL]: PANEL_EDITAR_GRUPO }),
        panel === PANEL_EDITAR_GRUPO,
      )
    },
    // Volver al resumen del grupo (cancelar, o guardar); `clave` es la nueva si el cambio tocó la clave del grupo (D42).
    abrirResumen: (clave: string) => {
      void escribir({ [CLAVE_DE_PANEL]: null, [claveDeUrl]: clave }, { history: 'replace' })
    },
  }
}
