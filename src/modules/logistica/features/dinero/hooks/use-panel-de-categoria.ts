'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_CATEGORIA,
  PANEL_EDITAR_CATEGORIA,
  PANEL_NUEVA_CATEGORIA,
} from '../../../entities/dinero/paneles'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_CATEGORIA]: parseAsString,
}

// El modal de una categoría de gasto en la URL: `?panel=nueva-categoria` o `?panel=editar-categoria&categoria=<id>`. Abrir suma al historial («atrás» lo cierra) y cerrar quita las dos claves.
export function usePanelDeCategoria() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVA_CATEGORIA
  const hayEdicion = panel === PANEL_EDITAR_CATEGORIA
  const editando = hayEdicion ? url[CLAVE_DE_CATEGORIA] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    hayEdicion,
    editando,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_NUEVA_CATEGORIA, [CLAVE_DE_CATEGORIA]: null },
            { history: 'push' },
          ),
        nuevo,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_EDITAR_CATEGORIA, [CLAVE_DE_CATEGORIA]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_CATEGORIA]: null })
    },
  }
}
