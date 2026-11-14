'use client'

import { Button } from '@/shared/ui/button'
import {
  CABECERA_DE_GANADA,
  SUBASTA_SIN_RESOLVER,
  type EstadoDelModoGanada,
} from '../../../entities/mover/ganada'

// Lo que el hueco «Qué falta» dice de «La ganamos»: dentro del modo, la cabecera o por qué no hay qué ofrecer; fuera, con la subasta sin resolver y
// permiso de mover, la línea con «La ganamos» (que abre el modo). «No la ganamos» vive en la ficha del vehículo.
export function LineaDeGanada({
  modo,
  ofrecer,
  alGanar,
}: {
  modo: EstadoDelModoGanada<unknown> | null
  ofrecer: boolean
  alGanar: () => void
}) {
  if (modo === null) {
    if (!ofrecer) return null
    return (
      <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
        <p>{SUBASTA_SIN_RESOLVER}</p>
        <Button variant="outline" className="min-h-11 md:min-h-9" onClick={alGanar}>
          La ganamos
        </Button>
      </div>
    )
  }
  return (
    <p className="text-(length:--text-sm) font-medium text-(--color-ink)" data-modo="ganada">
      {modo.tipo === 'listo' ? CABECERA_DE_GANADA : modo.texto}
    </p>
  )
}
