'use client'

import { Trash2Icon } from 'lucide-react'
import { contados, type OrigenResumen } from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'

type Props = {
  origen: OrigenResumen
  cantidad: number
  enCurso: boolean
  alEnviar: () => void
  alLimpiar: () => void
}

// Lo que se puede hacer con las filas elegidas. Se pega abajo: en una lista larga sigue a mano.
export function BarraDeSeleccion({ origen, cantidad, enCurso, alEnviar, alLimpiar }: Props) {
  return (
    <div
      role="region"
      aria-label="Selección"
      className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-3 py-2 shadow-(--shadow-md)"
    >
      <p aria-live="polite" className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Selección: {contados(cantidad, origen.sustantivo)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="h-11 md:h-8" onClick={alLimpiar} disabled={enCurso}>
          Quitar la selección
        </Button>
        <Button variant="destructive" className="h-11 md:h-8" onClick={alEnviar} disabled={enCurso}>
          <Trash2Icon aria-hidden />
          Enviar a la papelera
        </Button>
      </div>
    </div>
  )
}
