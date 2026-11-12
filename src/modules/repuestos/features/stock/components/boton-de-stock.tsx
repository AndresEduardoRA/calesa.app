'use client'

import { PackageIcon } from 'lucide-react'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { FilaDeItem } from '../../../entities/nucleo/item'

type Props = { fila: FilaDeItem; alAbrir: (itemId: string) => void }

// «Stock» en cada fila de la hoja (8.10-2, C11), también para quien sólo ve (el historial se lee con `repuestos.ver`, D5). Con algo en stock dice cuánto, en texto.
export function BotonDeStock({ fila, alAbrir }: Props) {
  return (
    <>
      {fila.stockCantidad > 0 ? (
        <Badge variant="outline" className="self-center tabular-nums">
          En stock: {formatearNumero(fila.stockCantidad)}
        </Badge>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-stock-item={fila.id}
        aria-label={`Stock del ítem ${fila.descripcion}`}
        className="min-h-11 md:min-h-9"
        onClick={() => {
          alAbrir(fila.id)
        }}
      >
        <PackageIcon aria-hidden />
        Stock
      </Button>
    </>
  )
}
