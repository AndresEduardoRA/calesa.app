'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import type { VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'

type Props = {
  elegido: VehiculoElegido
  // El historial del elegido, armado por la página (`vehiculos` no conoce `cotizaciones`): va debajo de su título.
  historial: ReactNode
  alQuitar: () => void
}

// La región «Elegido» del panel del vehículo: el de la hoja, con «Quitar» y su historial.
export function ElegidoDelPanel({ elegido, historial, alQuitar }: Props) {
  return (
    <section
      aria-label="Elegido"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-(--radius-card) border border-(--color-line) p-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Miniatura ruta={elegido.portadaRuta} className="w-12" />
        <span className="grid min-w-0 flex-1">
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Elegido</span>
          <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
        </span>
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alQuitar}>
          Quitar
        </Button>
      </div>
      {historial}
    </section>
  )
}
