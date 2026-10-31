'use client'

import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { VehiculoDelPanel as Vehiculo } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'

type Props = {
  vehiculo: Vehiculo
  seleccionado: boolean
  alElegir: (id: string) => void
}

// Un vehículo de la lista del panel: un botón que lo elige. El título se corta con «…»; el lote, el precio, cuándo cierra su subasta y
// cuándo se cotizó, si los tiene.
export function VehiculoDelPanel({ vehiculo, seleccionado, alElegir }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-current={seleccionado ? 'true' : undefined}
        onClick={() => {
          alElegir(vehiculo.id)
        }}
        className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-(--radius-md) p-2 text-left hover:bg-(--color-surface-3) aria-[current=true]:bg-(--color-surface-3)"
      >
        <Miniatura ruta={vehiculo.portadaRuta} className="w-16" />
        <span className="grid min-w-0 flex-1 gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
          <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
            {vehiculo.titulo}
          </span>
          {vehiculo.lote ? <span>Lote {vehiculo.lote}</span> : null}
          {vehiculo.precio === null ? null : (
            <Monto valor={vehiculo.precio} className="text-(--color-ink)" />
          )}
          {vehiculo.cierreSubastaEn ? (
            <span>
              Cierra {formatearFechaHora(vehiculo.cierreSubastaEn, { zona: zonaHoraria })}
            </span>
          ) : null}
          {vehiculo.cotizadoEn ? (
            <span>Cotizado {fechaRelativa(vehiculo.cotizadoEn, { zona: zonaHoraria })}</span>
          ) : null}
          {seleccionado ? <Badge className="w-fit">Seleccionado</Badge> : null}
        </span>
      </button>
    </li>
  )
}
