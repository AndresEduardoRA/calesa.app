'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { usePanelDeCompra } from '../hooks/use-panel-de-compra'
import type { ItemParaCompra, MonedaParaCompra } from './campos-de-compra'
import { DrawerDeCompraDiferido } from './diferidos'

type Props = {
  panel: ReturnType<typeof usePanelDeCompra>
  proyectoId: string
  items: readonly ItemParaCompra[]
  monedas: readonly MonedaParaCompra[]
}

// El Drawer de una compra se monta la primera vez que se abre (8.11-3, C12): hasta entonces su código no se pide.
export function PanelDeCompra({ panel, proyectoId, items, monedas }: Props) {
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (!montar) return null
  return (
    <DrawerDeCompraDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      apertura={panel.apertura}
      proyectoId={proyectoId}
      original={panel.original}
      items={items}
      monedas={monedas}
    />
  )
}
