import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos/client'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BadgeDeFase } from '../../listado/components/badge-de-fase'
import { Miniatura } from '../../listado/components/miniatura'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  // La fase actual, entre las del flujo del origen; null = sin fase.
  fase: FaseResumen | null
  // «Editar», si la persona puede.
  acciones?: ReactNode
}

// Lo que se ve de un vehículo arriba de todas sus pestañas: su portada, su título, su número, su
// origen y su fase. La fase se muestra y no se cambia acá (se mueve desde logística).
export function CabeceraDeVehiculo({ vehiculo, origen, fase, acciones }: Props) {
  return (
    <header className="flex flex-wrap items-start gap-4">
      <Miniatura ruta={vehiculo.portadaRuta} className="w-24" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          {vehiculo.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
          <span className="tabular-nums">#{vehiculo.numero}</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: origen.color }}
            />
            {origen.nombre}
          </span>
          <BadgeDeFase fase={fase} />
        </div>
      </div>
      {acciones ? <div className="flex gap-2">{acciones}</div> : null}
    </header>
  )
}
