'use client'

import { XIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { PersonaElegida } from '../../../entities/edicion'

type Props = {
  etiqueta: string
  elegidas: readonly PersonaElegida[]
  alQuitar: (persona: PersonaElegida) => void
}

// Las personas ya elegidas, cada una con su «Quitar a …» (con nombre, para el lector de pantalla).
export function PersonasElegidas({ etiqueta, elegidas, alQuitar }: Props) {
  if (elegidas.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${etiqueta}: elegidas`}>
      {elegidas.map((persona) => (
        <li
          key={persona.id}
          className="flex items-center gap-1 rounded-md bg-(--color-paper-dim) py-0.5 pr-1 pl-2.5 text-(length:--text-sm)"
        >
          <span>{persona.nombre}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 md:size-7"
            aria-label={`Quitar a ${persona.nombre}`}
            onClick={() => {
              alQuitar(persona)
            }}
          >
            <XIcon aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  )
}
