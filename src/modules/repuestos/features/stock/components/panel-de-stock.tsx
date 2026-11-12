'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { MENSAJE_ITEM_DE_STOCK_YA_NO_ESTA } from '../../../entities/stock/paneles'
import type { StockPorUrl } from '../hooks/use-stock-por-url'
import { DrawerDeStockDiferido } from './diferidos'

// Lo que el panel necesita de la hoja: encaja por forma con el `ApiDelHueco` de `items` (el área `stock` no lo importa).
export type ApiDeLaHojaParaStock = {
  filas: readonly FilaDeItem[]
  puedeEditar: boolean
  cerrado: boolean
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
}

type Props = { url: StockPorUrl; api: ApiDeLaHojaParaStock }

// El panel del stock de un ítem (8.10-2, C10): busca el ítem en las filas vigentes de la hoja; uno que ya no está no abre (se avisa y la URL se limpia, una vez). Mientras
// se va, conserva el último que vio. Se monta la primera vez que se abre.
export function PanelDeStock({ url, api }: Props) {
  const encontrado = api.filas.find((f) => f.id === url.itemId) ?? null
  const rechazado = useRevisionAlAbrir(
    url.abierto ? `${String(url.apertura)}:${url.itemId ?? ''}` : null,
    url.abierto && encontrado === null ? MENSAJE_ITEM_DE_STOCK_YA_NO_ESTA : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazado && encontrado !== null
  const item = useUltimo(abierto ? encontrado : null)
  const montar = useAbiertoAlgunaVez(abierto)
  if (!montar) return null
  return (
    <DrawerDeStockDiferido
      abierto={abierto}
      alCerrar={url.cerrar}
      apertura={url.apertura}
      item={item}
      puedeEditar={api.puedeEditar}
      cambiarFila={api.cambiarFila}
      focoAlCerrar={() => focoDeStock(item)}
    />
  )
}

// Al cerrar el panel el foco vuelve al botón «Stock» de esa fila (la URL lo abrió y el botón pudo redibujarse).
function focoDeStock(item: FilaDeItem | null): HTMLElement | true {
  return (item && document.querySelector<HTMLElement>(`[data-stock-item="${item.id}"]`)) ?? true
}
