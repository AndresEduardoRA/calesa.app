'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_NIVEL, PANEL_NUEVO_NIVEL, PANEL_RENOMBRAR_NIVEL } from '../../../entities/nivel'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_NIVEL]: parseAsString,
}

// El modal de un nivel, en la URL: `?panel=nuevo-nivel` o `?panel=renombrar-nivel&nivel=<id>`. Abrir suma al historial («atrás» lo cierra);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la lista ya está.
export function usePanelDeNivel() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  return {
    nuevo: panel === PANEL_NUEVO_NIVEL,
    renombrando: panel === PANEL_RENOMBRAR_NIVEL ? url[CLAVE_DE_NIVEL] : null,
    // `?panel=renombrar-nivel` sin su id también es un renombre (que no abre): se revisa al abrir.
    hayRenombre: panel === PANEL_RENOMBRAR_NIVEL,
    abrirNuevo: () => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_NUEVO_NIVEL, [CLAVE_DE_NIVEL]: null },
        { history: 'push' },
      )
    },
    abrirRenombre: (id: string) => {
      void setUrl(
        { [CLAVE_DE_PANEL]: PANEL_RENOMBRAR_NIVEL, [CLAVE_DE_NIVEL]: id },
        { history: 'push' },
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_NIVEL]: null })
    },
  }
}
