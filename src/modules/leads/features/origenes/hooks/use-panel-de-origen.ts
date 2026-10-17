'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_ORIGEN,
  PANEL_EDITAR_ORIGEN,
  PANEL_NUEVO_ORIGEN,
} from '../../../entities/origen-de-lead'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_ORIGEN]: parseAsString,
}

// El modal de un origen, en la URL: `?panel=nuevo-origen` o `?panel=editar-origen&origen=<id>`. Abrir
// suma al historial («atrás» lo cierra); cerrar quita las dos claves. Sin `shallow: false`: abrirlo no
// necesita al servidor, la lista ya está.
export function usePanelDeOrigen() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  return {
    nuevo: panel === PANEL_NUEVO_ORIGEN,
    editando: panel === PANEL_EDITAR_ORIGEN ? url[CLAVE_DE_ORIGEN] : null,
    // `?panel=editar-origen` sin `origen` también es una edición (que no abre): se revisa al abrir.
    hayEdicion: panel === PANEL_EDITAR_ORIGEN,
    abrirNuevo: () => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_NUEVO_ORIGEN, [CLAVE_DE_ORIGEN]: null },
        { history: 'push' },
      )
    },
    abrirEdicion: (id: string) => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_EDITAR_ORIGEN, [CLAVE_DE_ORIGEN]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_ORIGEN]: null })
    },
  }
}
