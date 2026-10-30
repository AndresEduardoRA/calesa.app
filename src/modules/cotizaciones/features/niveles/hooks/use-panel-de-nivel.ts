'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_NIVEL, PANEL_NUEVO_NIVEL, PANEL_RENOMBRAR_NIVEL } from '../../../entities/nivel'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_NIVEL]: parseAsString,
}

// El modal de un nivel, en la URL: `?panel=nuevo-nivel` o `?panel=renombrar-nivel&nivel=<id>`. Abrir suma al historial («atrás» lo cierra);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la lista ya está. Tras recargar con el modal abierto, «atrás»
// devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`; renombrar se abre desde el «⋯» de la fila: el foco vuelve al «⋯»).
export function usePanelDeNivel() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_NIVEL
  // `?panel=renombrar-nivel` sin su id también es un renombre (que no abre): se revisa al abrir.
  const hayRenombre = panel === PANEL_RENOMBRAR_NIVEL
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayRenombre)
  return {
    nuevo,
    renombrando: hayRenombre ? url[CLAVE_DE_NIVEL] : null,
    hayRenombre,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_NUEVO_NIVEL, [CLAVE_DE_NIVEL]: null },
            { history: 'push' },
          ),
        nuevo,
      )
    },
    abrirRenombre: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_RENOMBRAR_NIVEL, [CLAVE_DE_NIVEL]: id },
            { history: 'push' },
          ),
        hayRenombre && url[CLAVE_DE_NIVEL] === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_NIVEL]: null })
    },
  }
}
