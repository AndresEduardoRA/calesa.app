'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_ITEM_DE_STOCK } from '../../../entities/stock/paneles'
import {
  PANEL_DEVOLVER_STOCK,
  PANEL_REASIGNAR_STOCK,
  PANEL_VENDER_STOCK,
} from '../../../entities/stock/vista'

export type PanelDeStockPorUrl = ReturnType<typeof usePanelDeStock>

// Un panel de la vista «Stock» en la URL (`?panel=<panel>&item=<id>`): se puede recargar y «atrás» lo cierra. Abrir sólo escribe sus claves, así `?vista=` y `?cursor=`
// quedan. `apertura` remonta el contenido en cada apertura (un formulario vacío, un id de intento nuevo).
function usePanelDeStock(panel: string) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_ITEM_DE_STOCK])
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

// Las acciones de una fila de la vista «Stock» (8.10-3, C10): «Reasignar a un proyecto», «Vender suelto» y «Devolver al proveedor», cada una con su URL.
export function useAccionesDeStockPorUrl() {
  return {
    reasignar: usePanelDeStock(PANEL_REASIGNAR_STOCK),
    vender: usePanelDeStock(PANEL_VENDER_STOCK),
    devolver: usePanelDeStock(PANEL_DEVOLVER_STOCK),
  }
}

export type AccionesDeStockPorUrl = ReturnType<typeof useAccionesDeStockPorUrl>
