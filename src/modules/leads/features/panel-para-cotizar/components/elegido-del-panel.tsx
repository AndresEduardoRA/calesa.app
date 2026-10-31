'use client'

import { Button } from '@/shared/ui/button'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import type { ClienteElegido } from '../../../entities/panel-para-cotizar'

type Props = {
  elegido: ClienteElegido
  // El nombre de su tipo, del catálogo (que llega con la lista); nulo mientras no llega.
  tipo: string | null
  alQuitar: () => void
}

// La región «Elegido» del panel del cliente: el de la hoja, con su número y su tipo, y «Quitar» (guardar vuelve a pedir el cliente).
export function ElegidoDelPanel({ elegido, tipo, alQuitar }: Props) {
  return (
    <section
      aria-label="Elegido"
      className="flex min-w-0 items-center gap-3 rounded-(--radius-card) border border-(--color-line) p-2"
    >
      <span className="grid min-w-0 flex-1">
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">Elegido</span>
        <span className="truncate font-medium text-(--color-ink)">{elegido.nombre}</span>
        <span className="flex min-w-0 flex-wrap gap-x-2 text-(length:--text-xs) text-(--color-ink-soft)">
          <NumeroDeLead numeros={elegido.numeros} />
          {tipo ? <span>{tipo}</span> : null}
        </span>
      </span>
      <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alQuitar}>
        Quitar
      </Button>
    </section>
  )
}
