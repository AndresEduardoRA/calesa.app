'use client'

import { PanelRightOpenIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { FilaDeItem } from '../../../entities/nucleo/item'

type Props = { fila: Pick<FilaDeItem, 'id' | 'descripcion'>; alAbrir: (itemId: string) => void }

// «Abrir panel» en cada fila de la hoja (8.13-2, D4): el panel del ítem, con «Qué falta» y mover, sus documentos, su transporte, sus notas y su historial. Lo ve quien ve la hoja.
export function BotonDelPanelDelItem({ fila, alAbrir }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-panel-item={fila.id}
      aria-label={`Abrir el panel del ítem ${fila.descripcion}`}
      className="min-h-11 md:min-h-9"
      onClick={() => {
        alAbrir(fila.id)
      }}
    >
      <PanelRightOpenIcon aria-hidden />
      Abrir panel
    </Button>
  )
}
