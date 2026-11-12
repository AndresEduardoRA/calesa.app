'use client'

import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'

type Props = { monto: number; moneda: string; montoBase: number }

// El monto de una fila en su moneda y, si no es la base, lo que la base guardó como su equivalente (`monto_base`: acá nunca se calcula). Ningún número de la lista se suma.
export function MontoDeLaFila({ monto, moneda, montoBase }: Props) {
  const { monedaBase } = useRegional()
  return (
    <span className="grid justify-items-end tabular-nums">
      <Monto valor={monto} moneda={moneda} className="font-medium" />
      {moneda !== monedaBase ? (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">
          Equivale a <Monto valor={montoBase} />
        </span>
      ) : null}
    </span>
  )
}
