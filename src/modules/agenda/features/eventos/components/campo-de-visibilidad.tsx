'use client'

import { useId } from 'react'
import { visibilidadElegible, type Visibilidad } from '../../../entities/visibilidad'

const OPCIONES: readonly { valor: Visibilidad; etiqueta: string; ayuda: string }[] = [
  { valor: 'privado', etiqueta: 'Privado', ayuda: 'Sólo tú lo ves.' },
  { valor: 'publico', etiqueta: 'Público', ayuda: 'Todo el equipo lo ve.' },
  { valor: 'seleccionados', etiqueta: 'Seleccionados', ayuda: 'Las personas que elijas.' },
]

export const MOTIVO_SIN_PUBLICAR = 'No tienes permiso para publicar eventos.'

type Props = {
  valor: Visibilidad
  puedePublicar: boolean
  alCambiar: (valor: Visibilidad) => void
  error?: string
}

// Quién ve el evento. Las opciones que piden `agenda.eventos.publicar` se muestran deshabilitadas con su motivo (la base lo vuelve a exigir).
export function CampoDeVisibilidad({ valor, puedePublicar, alCambiar, error }: Props) {
  const grupo = useId()
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        ¿Quién lo ve?
      </legend>
      {OPCIONES.map((opcion) => {
        const habilitada = visibilidadElegible(opcion.valor, puedePublicar)
        const idAyuda = `${grupo}-${opcion.valor}`
        return (
          <label
            key={opcion.valor}
            className="flex min-h-11 items-start gap-2 rounded-(--radius-md) border border-(--color-line) px-3 py-2 has-disabled:opacity-60 md:min-h-9"
          >
            <input
              type="radio"
              name={grupo}
              value={opcion.valor}
              checked={valor === opcion.valor}
              disabled={!habilitada}
              aria-describedby={idAyuda}
              className="mt-1"
              onChange={() => {
                alCambiar(opcion.valor)
              }}
            />
            <span className="grid">
              <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                {opcion.etiqueta}
              </span>
              <span id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-soft)">
                {habilitada ? opcion.ayuda : MOTIVO_SIN_PUBLICAR}
              </span>
            </span>
          </label>
        )
      })}
      {error ? <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p> : null}
    </fieldset>
  )
}
