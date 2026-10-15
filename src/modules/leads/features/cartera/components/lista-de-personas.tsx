'use client'

import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { CandidatoDeCartera } from '../../../entities/cartera'

type Props = {
  texto: string
  alBuscar: (texto: string) => void
  visibles: readonly CandidatoDeCartera[]
  elegidoId: string | null
  alElegir: (id: string) => void
}

// La búsqueda y la lista de personas a las que se les puede dar el lead (una sola se elige).
export function ListaDePersonas({ texto, alBuscar, visibles, elegidoId, alElegir }: Props) {
  const idBusqueda = useId()
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={idBusqueda}>Buscar persona</Label>
        <Input
          id={idBusqueda}
          value={texto}
          autoComplete="off"
          onChange={(evento) => {
            alBuscar(evento.target.value)
          }}
        />
      </div>
      <fieldset className="grid gap-1">
        <legend className="sr-only">Personas</legend>
        {visibles.length === 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Nadie coincide con lo que escribiste.
          </p>
        ) : (
          visibles.map((c) => (
            <label
              key={c.id}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-(--radius-md) px-2 hover:bg-(--color-surface-sunken) has-[:checked]:bg-(--color-surface-sunken) md:min-h-9"
            >
              <input
                type="radio"
                name="persona-de-cartera"
                value={c.id}
                checked={elegidoId === c.id}
                onChange={() => {
                  alElegir(c.id)
                }}
              />
              <span className="text-(length:--text-sm)">{c.nombre}</span>
            </label>
          ))
        )}
      </fieldset>
    </div>
  )
}
