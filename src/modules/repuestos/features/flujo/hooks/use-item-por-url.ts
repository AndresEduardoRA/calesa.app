'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_ITEM_DEL_PANEL } from '../../../entities/flujo/paneles'

export type ItemPorUrl = ReturnType<typeof useItemPorUrl>

const PARSERS = { item: parseAsString, panel: parseAsString }

// El panel de un ítem en la URL (`?item=<id>`, 8.13-2): `abrir(id)` pone `item` y quita `panel` (el stock y las imágenes usan `?panel=…&item=`; no se pisan) y vuelve a pedir la página al
// servidor, que es quien lee el ítem (`shallow: false`). Suma al historial: «atrás» lo cierra y, tras recargar, devuelve el foco a quien lo abrió. Cerrar suelta `item`.
export function useItemPorUrl() {
  const [valores, escribir] = useQueryStates(PARSERS, { shallow: false })
  const abierto = valores[CLAVE_DE_ITEM_DEL_PANEL] !== null && valores.panel === null
  useVueltaDelFoco(CLAVE_DE_ITEM_DEL_PANEL, abierto)
  return {
    abierto,
    abrir: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_ITEM_DEL_PANEL,
        () => escribir({ item: id, panel: null }, { history: 'push' }),
        abierto && valores.item === id,
      )
    },
    cerrar: () => {
      void escribir({ item: null })
    },
  }
}
