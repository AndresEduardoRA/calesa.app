'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Button } from './button'

type Props = {
  // El día elegido con `<IrAUnaFecha>` (`YYYY-MM-DD`); quien lo dibuja decide cuándo hay uno.
  dia: string
  zona: string
  ocupado: boolean
  // El texto del botón, por lo que se lista («Volver a los más recientes», «… a las más recientes»).
  volver: string
  alVolver: () => void
}

// Arriba de una lista que se está mirando desde una fecha: desde cuándo, y volver a lo más nuevo.
export function DesdeUnaFecha({ dia, zona, ocupado, volver, alVolver }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Desde el {formatearFecha(dia, { zona })}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={alVolver}
        disabled={ocupado}
      >
        {volver}
      </Button>
    </div>
  )
}
