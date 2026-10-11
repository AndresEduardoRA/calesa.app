'use client'

import { useId } from 'react'
import { cn } from 'cn'

type Opcion<Valor extends string> = { valor: Valor; etiqueta: string }

type Props<Valor extends string> = {
  etiqueta: string
  ayuda?: string
  opciones: readonly Opcion<Valor>[]
  valor: Valor | null
  alCambiar: (valor: Valor) => void
  deshabilitado?: boolean
}

// Elegir una entre pocas opciones a la vista (tema, densidad). Son radios nativos con otra piel:
// las flechas, el foco y el lector de pantalla funcionan sin escribir nada.
export function Opciones<Valor extends string>({
  etiqueta,
  ayuda,
  opciones,
  valor,
  alCambiar,
  deshabilitado,
}: Props<Valor>) {
  const grupo = useId()

  return (
    <fieldset className="grid gap-1.5" disabled={deshabilitado}>
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        {etiqueta}
      </legend>
      <div className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-(--radius-md) bg-(--color-paper-dim) p-1">
        {opciones.map((opcion) => (
          <label key={opcion.valor} className="cursor-pointer">
            <input
              type="radio"
              name={grupo}
              value={opcion.valor}
              checked={valor === opcion.valor}
              className="peer sr-only"
              onChange={() => {
                alCambiar(opcion.valor)
              }}
            />
            <span
              className={cn(
                'flex min-h-11 items-center rounded-(--radius-sm) px-3 text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8',
                'peer-checked:bg-(--color-surface) peer-checked:font-medium peer-checked:text-(--color-ink) peer-checked:shadow-(--shadow-sm)',
                'peer-focus-visible:shadow-(--shadow-focus)',
              )}
            >
              {opcion.etiqueta}
            </span>
          </label>
        ))}
      </div>
      {ayuda ? <p className="text-(length:--text-sm) text-(--color-ink-faint)">{ayuda}</p> : null}
    </fieldset>
  )
}
