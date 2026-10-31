'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
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
// suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la lista ya está.
export function usePanelDeOrigen() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_ORIGEN
  const editando = panel === PANEL_EDITAR_ORIGEN ? url[CLAVE_DE_ORIGEN] : null
  // `?panel=editar-origen` sin `origen` también es una edición (que no abre): se revisa al abrir.
  const hayEdicion = panel === PANEL_EDITAR_ORIGEN
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
            { [CLAVE_DE_PANEL]: PANEL_NUEVO_ORIGEN, [CLAVE_DE_ORIGEN]: null },
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
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_ORIGEN, [CLAVE_DE_ORIGEN]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_ORIGEN]: null })
    },
  }
}
