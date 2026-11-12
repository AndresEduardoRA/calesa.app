'use client'

import { useCallback } from 'react'
import { HojaDeItems, type HuecoDeLaHoja } from '@/modules/repuestos/pantallas/items'
import { BotonDeStock, PanelDeStock, useStockPorUrl } from '@/modules/repuestos/pantallas/stock'
import type { ComponentProps } from 'react'

// La hoja del proyecto con el stock de cada ítem en su hueco (8.10-2, D4): el área `items` no importa `stock`, y una función no cruza de un Server Component a uno de
// cliente, así que el hueco se llena acá.
export function HojaConStock(props: ComponentProps<typeof HojaDeItems>) {
  const stock = useStockPorUrl()
  const { abrir } = stock
  const accionDeFila = useCallback<HuecoDeLaHoja['accionDeFila']>(
    (fila) => <BotonDeStock fila={fila} alAbrir={abrir} />,
    [abrir],
  )
  return (
    <HojaDeItems
      {...props}
      hueco={{ accionDeFila, panel: (api) => <PanelDeStock url={stock} api={api} /> }}
    />
  )
}
