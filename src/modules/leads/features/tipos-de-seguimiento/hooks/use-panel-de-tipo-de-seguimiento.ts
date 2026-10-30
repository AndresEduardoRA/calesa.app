'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_TIPO_DE_SEGUIMIENTO,
  PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
  PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
} from '../../../entities/tipo-de-seguimiento'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: parseAsString,
}

// El modal de un tipo de seguimiento, en la URL: `?panel=nuevo-tipo-de-seguimiento` o `?panel=editar-tipo-de-seguimiento&tipo-de-seguimiento=<id>`. Abrir
// suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la lista ya está.
export function usePanelDeTipoDeSeguimiento() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_TIPO_DE_SEGUIMIENTO
  const editando =
    panel === PANEL_EDITAR_TIPO_DE_SEGUIMIENTO ? url[CLAVE_DE_TIPO_DE_SEGUIMIENTO] : null
  // `?panel=editar-tipo-de-seguimiento` sin su id también es una edición (que no abre): se revisa al abrir.
  const hayEdicion = panel === PANEL_EDITAR_TIPO_DE_SEGUIMIENTO
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    editando,
    hayEdicion,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            {
              [CLAVE_DE_PANEL]: PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
              [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: null,
            },
            { history: 'push' },
          ),
        nuevo,
      )
    },
    // Con la edición de otro abierta, marca otra vez: «ya abierto» mira el id.
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            {
              [CLAVE_DE_PANEL]: PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
              [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: id,
            },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: null })
    },
  }
}
