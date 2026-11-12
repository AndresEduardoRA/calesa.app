'use client'

import { useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import type { PanelesDelCatalogo } from './paneles-del-catalogo'

// El modal de un puerto o de una naviera en la URL: `?panel=nuevo-puerto` o `?panel=editar-puerto&puerto=<id>` (y los de naviera). Abrir suma al historial («atrás» lo cierra) y cerrar quita las dos claves.
export function usePanelDelCatalogo({
  nuevo: PANEL_NUEVO,
  editar: PANEL_EDITAR,
  clave,
  parametros,
}: PanelesDelCatalogo) {
  const [url, setUrl] = useQueryStates(parametros)
  const panel = url[CLAVE_DE_PANEL] ?? null
  const nuevo = panel === PANEL_NUEVO
  const hayEdicion = panel === PANEL_EDITAR
  const editando = hayEdicion ? (url[clave] ?? null) : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    hayEdicion,
    editando,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_NUEVO, [clave]: null }, { history: 'push' }),
        nuevo,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_EDITAR, [clave]: id }, { history: 'push' }),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [clave]: null })
    },
  }
}
