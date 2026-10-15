import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import type { VehiculoDelLead } from '../../../entities/vehiculos-del-lead'
import { Miniatura } from '../../listado/components/miniatura'

type Props = {
  vehiculo: VehiculoDelLead
  // Lo propio de la lista: desde cuándo está vinculado, o la nota del interés.
  detalle?: ReactNode
  acciones?: ReactNode
}

// Un vehículo en la sección «Vehículos» del lead: la miniatura, el título (abre su ficha), el número y
// el origen. Los nombres del origen salen de su fila.
export function FilaDeVehiculoDelLead({ vehiculo, detalle, acciones }: Props) {
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
      <Miniatura ruta={vehiculo.portada} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Link
          href={`${RUTAS.vehiculos}/${vehiculo.id}` as Route}
          className="w-fit font-medium break-words text-(--color-ink) underline-offset-2 hover:underline"
        >
          {vehiculo.titulo}
        </Link>
        <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
          #{vehiculo.numero}
          {vehiculo.origenNombre ? ` · ${vehiculo.origenNombre}` : null}
        </span>
        {detalle}
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </li>
  )
}
