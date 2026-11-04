'use client'

import { Monto } from '@/shared/ui/monto'

type Props = {
  // El total con que se guardó la cotización (`totales.usd`); nulo, no había.
  totalUsd: number | null
  // Lo de hoy no es lo guardado: una tabla de referencia o un dato del vehículo cambió desde que se guardó (C11).
  hayAviso: boolean
  // Se dice el total de antes: el de hoy es otro, o no hay uno de hoy.
  muestraElTotal: boolean
}

// Lo de hoy contra lo guardado (C11): al abrir una cotización guardada la hoja recalcula con SU versión y SUS tipos de cambio, pero con las tablas y los datos del vehículo de hoy.
// Si eso no da lo guardado se dice, y si el total es otro, también el total con que se guardó: el snapshot es la autoridad. Quien sólo ve lee las dos cifras.
export function TotalGuardado({ totalUsd, hayAviso, muestraElTotal }: Props) {
  if (!hayAviso && !muestraElTotal) {
    return null
  }
  return (
    <div className="grid gap-1">
      {muestraElTotal ? (
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)">
          <span>Total guardado</span>
          <strong data-total-cotizado="" className="font-semibold text-(--color-ink) tabular-nums">
            {totalUsd === null ? '—' : <Monto valor={totalUsd} moneda="USD" />}
          </strong>
        </p>
      ) : null}
      {hayAviso ? (
        <p
          role="status"
          data-aviso-de-hoy=""
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          Lo de hoy no es lo guardado: cambió una tabla o un dato del vehículo desde que se guardó.
        </p>
      ) : null}
    </div>
  )
}
