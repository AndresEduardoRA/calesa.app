import type { ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import type { CotizacionEnPapelera as Cotizacion } from '../../../entities/papelera/lotes'

type Props = {
  cotizacion: Cotizacion
  // El nombre de su origen (la página lee los orígenes); «—» si no llegó.
  nombreDelOrigen: string | null
  zonaHoraria: string
  acciones: ReactNode
}

// Una cotización del lote: su título, su número, su clase, su origen y cuándo se creó. Ningún monto: el lote no trae el total (P6 del 4.24-1a).
export function CotizacionEnPapelera({
  cotizacion,
  nombreDelOrigen,
  zonaHoraria,
  acciones,
}: Props) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-3 px-3 py-2">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate font-medium text-(--color-ink)">{cotizacion.titulo}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-xs) text-(--color-ink-soft)">
          <span className="tabular-nums">N.º {cotizacion.numero}</span>
          <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
          <span>{nombreDelOrigen ?? '—'}</span>
          <span>Creada el {formatearFecha(cotizacion.creadoEn, { zona: zonaHoraria })}</span>
        </p>
      </div>
      {acciones}
    </li>
  )
}
