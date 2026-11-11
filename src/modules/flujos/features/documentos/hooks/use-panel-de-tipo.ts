'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DEL_GRUPO,
  CLAVE_DEL_TIPO,
  PANEL_EDITAR_TIPO,
  PANEL_NUEVO_TIPO,
  type ClaveDeGrupo,
} from '../../../entities/documentos/tipo-de-documento'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DEL_TIPO]: parseAsString,
  [CLAVE_DEL_GRUPO]: parseAsString,
}

// El modal de un tipo de documento, en la URL: `?panel=nuevo-tipo&de=empresa|flujo` o `?panel=editar-tipo&tipo=<id>`. Abrir suma al historial
// («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`); cerrar quita las claves. Sin `shallow: false`:
// abrirlo no necesita al servidor, los dos grupos ya están en la página.
export function usePanelDeTipo() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_TIPO
  const editando = panel === PANEL_EDITAR_TIPO ? url[CLAVE_DEL_TIPO] : null
  // `?panel=editar-tipo` sin su id también es una edición (que no abre): se revisa al abrir.
  const hayEdicion = panel === PANEL_EDITAR_TIPO
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    // El grupo donde se crea (lo que dice la URL, sin validar: lo revisa `motivoParaNoAbrirTipo`).
    de: nuevo ? url[CLAVE_DEL_GRUPO] : null,
    editando,
    hayEdicion,
    abrirNuevo: (de: ClaveDeGrupo) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_NUEVO_TIPO, [CLAVE_DEL_TIPO]: null, [CLAVE_DEL_GRUPO]: de },
            { history: 'push' },
          ),
        nuevo && url[CLAVE_DEL_GRUPO] === de,
      )
    },
    // Con la edición de otro abierta, marca otra vez: «ya abierto» mira el id.
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_TIPO, [CLAVE_DEL_TIPO]: id, [CLAVE_DEL_GRUPO]: null },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DEL_TIPO]: null, [CLAVE_DEL_GRUPO]: null })
    },
  }
}
