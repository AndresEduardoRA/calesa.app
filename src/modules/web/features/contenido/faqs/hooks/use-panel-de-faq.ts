'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_FAQ,
  PANEL_EDITAR_FAQ,
  PANEL_NUEVA_FAQ,
} from '../../../../entities/contenido/paneles'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_FAQ]: parseAsString }
const SIN_PANEL = { [CLAVE_DE_PANEL]: null, [CLAVE_DE_FAQ]: null }

// El panel de una pregunta frecuente en la URL: `?panel=nueva-faq` o `?panel=faq&faq=<id>`. Abrir suma al historial («atrás» lo cierra) y cerrar quita las
// dos claves. (La pestaña vive en `?seccion=`: no se pisan.)
export function usePanelDeFaq() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nueva = panel === PANEL_NUEVA_FAQ
  const hayEdicion = panel === PANEL_EDITAR_FAQ
  const editando = hayEdicion ? url[CLAVE_DE_FAQ] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nueva || hayEdicion)
  return {
    nueva,
    hayEdicion,
    editando,
    abrirNueva: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_NUEVA_FAQ }, { history: 'push' }),
        nueva,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_EDITAR_FAQ, [CLAVE_DE_FAQ]: id },
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
