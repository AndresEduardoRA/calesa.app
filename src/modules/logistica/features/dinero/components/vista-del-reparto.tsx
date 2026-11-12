'use client'

import { Monto } from '@/shared/ui/monto'
import type { VistaDelReparto } from '../../../entities/dinero/reparto'

type Props = { vista: VistaDelReparto; moneda: string; hayMonto: boolean }

// Cuánto le toca a cada unidad antes de confirmar (6.11-4): cada parte en la moneda del gasto y la suma de las partes, que es el monto tipeado. Nunca un equivalente en base: lo calcula la base al confirmar.
export function VistaDelReparto({ vista, moneda, hayMonto }: Props) {
  if (!hayMonto) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Escribe el monto para ver cuánto le toca a cada unidad.
      </p>
    )
  }
  const una = vista.filas.length === 1
  return (
    <div className="grid gap-2" data-vista-del-reparto>
      <ul aria-label="Cuánto le toca a cada unidad" className="grid gap-1">
        {vista.filas.map((fila) => (
          <li
            key={fila.unidadId}
            className="flex items-baseline justify-between gap-3 border-b border-(--color-line) py-1"
          >
            <span className="min-w-0 truncate">{fila.titulo}</span>
            <span className="shrink-0">
              {una ? (
                <span className="mr-2 text-(--color-ink-soft)">Le toca todo el monto</span>
              ) : null}
              <Monto valor={fila.parte} moneda={moneda} />
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between gap-3 font-medium">
        <span>Suma de las partes</span>
        <Monto valor={vista.suma} moneda={moneda} />
      </p>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        El equivalente en la moneda base lo calcula el sistema al confirmar.
      </p>
    </div>
  )
}
