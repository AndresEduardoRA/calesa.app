'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
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
// suma al historial («atrás» lo cierra); cerrar quita las dos claves. Sin `shallow: false`: abrirlo no
// necesita al servidor, la lista ya está.
export function usePanelDeTipoDeSeguimiento() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  return {
    nuevo: panel === PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
    editando: panel === PANEL_EDITAR_TIPO_DE_SEGUIMIENTO ? url[CLAVE_DE_TIPO_DE_SEGUIMIENTO] : null,
    // `?panel=editar-tipo-de-seguimiento` sin su id también es una edición (que no abre): se revisa al abrir.
    hayEdicion: panel === PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
    abrirNuevo: () => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_NUEVO_TIPO_DE_SEGUIMIENTO, [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: null },
        { history: 'push' },
      )
    },
    abrirEdicion: (id: string) => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_EDITAR_TIPO_DE_SEGUIMIENTO, [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: null })
    },
  }
}
