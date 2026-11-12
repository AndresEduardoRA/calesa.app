'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { leerPersonasParaTarea } from '../../../composicion.client'
import type { PersonaElegida } from '../../../entities/edicion'
import { SelectorDePersonas } from '../../personas/components/selector-de-personas'

type Props = {
  enCurso: boolean
  // Lo que dijo la base junto al selector (`hint responsable_id`): quien no puede recibir, no es miembro del chat…
  error?: string
  alReasignar: (persona: PersonaElegida) => void
}

// «Cambiar de responsable»: un despliegue dentro del mismo panel (no es otro drawer) con el selector de una persona y «Reasignar». La base decide
// quién puede recibir; aquí sólo se busca y se pide.
export function ReasignarTarea({ enCurso, error, alReasignar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [elegida, setElegida] = useState<PersonaElegida | null>(null)
  if (!abierto) {
    return (
      <Button
        variant="outline"
        className="min-h-11 md:min-h-9"
        aria-expanded={false}
        onClick={() => {
          setAbierto(true)
        }}
      >
        Cambiar de responsable
      </Button>
    )
  }
  return (
    <div className="grid gap-3 rounded-md border border-(--color-line) p-3">
      <SelectorDePersonas
        etiqueta="Nuevo responsable"
        elegidas={elegida ? [elegida] : []}
        alCambiar={(personas) => {
          setElegida(personas[0] ?? null)
        }}
        leer={leerPersonasParaTarea}
        error={error}
        enfocar
      />
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11 md:min-h-9"
          disabled={!elegida || enCurso}
          onClick={() => {
            if (elegida) {
              alReasignar(elegida)
            }
          }}
        >
          Reasignar
        </Button>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={enCurso}
          onClick={() => {
            setAbierto(false)
            setElegida(null)
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
