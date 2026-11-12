'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_ITEM_DE_STOCK, PANEL_STOCK } from '../../../entities/stock/paneles'

export type StockPorUrl = ReturnType<typeof useStockPorUrl>

// El panel del stock de un ítem en la URL (`?panel=stock&item=<id>`, 8.10-2, C10): se puede recargar y «atrás» lo cierra. No recibe las filas: lo llama `src/app`, que
// no las tiene; buscar el ítem y avisar si ya no está es de `<PanelDeStock>`. `apertura` remonta el contenido en cada apertura.
export function useStockPorUrl() {
  const url = usePanelPorUrl(PANEL_STOCK, [CLAVE_DE_ITEM_DE_STOCK])
  const apertura = useApertura(url.abierto)
  return {
    abierto: url.abierto,
    itemId: url.valor(CLAVE_DE_ITEM_DE_STOCK),
    apertura,
    abrir: (itemId: string) => {
      url.abrir({ [CLAVE_DE_ITEM_DE_STOCK]: itemId })
    },
    cerrar: url.cerrar,
  }
}
