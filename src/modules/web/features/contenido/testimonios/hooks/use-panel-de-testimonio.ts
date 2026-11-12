'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_TESTIMONIO,
  PANEL_EDITAR_TESTIMONIO,
  PANEL_NUEVO_TESTIMONIO,
} from '../../../../entities/contenido/paneles'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_TESTIMONIO]: parseAsString }
const SIN_PANEL = { [CLAVE_DE_PANEL]: null, [CLAVE_DE_TESTIMONIO]: null }

// El panel de un testimonio en la URL: `?panel=nuevo-testimonio` o `?panel=testimonio&testimonio=<id>`. Abrir suma al historial («atrás» lo cierra) y cerrar quita las
// dos claves. (La pestaña vive en `?seccion=`: no se pisan.)
export function usePanelDeTestimonio() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nueva = panel === PANEL_NUEVO_TESTIMONIO
  const hayEdicion = panel === PANEL_EDITAR_TESTIMONIO
  const editando = hayEdicion ? url[CLAVE_DE_TESTIMONIO] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nueva || hayEdicion)
  return {
    nueva,
    hayEdicion,
    editando,
    abrirNueva: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl({ ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_NUEVO_TESTIMONIO }, { history: 'push' }),
        nueva,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_EDITAR_TESTIMONIO, [CLAVE_DE_TESTIMONIO]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl(SIN_PANEL)
    },
  }
}
