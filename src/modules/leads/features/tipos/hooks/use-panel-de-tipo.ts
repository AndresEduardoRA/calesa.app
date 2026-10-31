'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_TIPO, PANEL_EDITAR_TIPO, PANEL_NUEVO_TIPO } from '../../../entities/tipo-de-lead'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_TIPO]: parseAsString,
}

// El modal de un tipo, en la URL: `?panel=nuevo-tipo` o `?panel=editar-tipo&tipo=<id>`. Abrir
// suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la lista ya está.
export function usePanelDeTipo() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_TIPO
  const editando = panel === PANEL_EDITAR_TIPO ? url[CLAVE_DE_TIPO] : null
  // `?panel=editar-tipo` sin `tipo` también es una edición (que no abre): se revisa al abrir.
  const hayEdicion = panel === PANEL_EDITAR_TIPO
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
            { [CLAVE_DE_PANEL]: PANEL_NUEVO_TIPO, [CLAVE_DE_TIPO]: null },
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
          setUrl({ [CLAVE_DE_PANEL]: PANEL_EDITAR_TIPO, [CLAVE_DE_TIPO]: id }, { history: 'push' }),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_TIPO]: null })
    },
  }
}
