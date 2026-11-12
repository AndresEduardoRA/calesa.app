'use client'

import { useId } from 'react'
import { cn } from 'cn'
import { coloresParaElegir } from '../../../entities/fases/colores-de-fase'

type Props = {
  valor: string
  alElegir: (color: string) => void
  // El `id` del primer radio: a donde va el foco si el color tiene un error.
  idDelPrimero?: string
  error?: string | undefined
  deshabilitado?: boolean
}

// Elegir el color de una fase de una paleta cerrada de baldosas con nombre (D7): radios nativos de 44 px, como `SelectorDeIcono`, y cada color dicho con
// texto además de pintado. Un color fuera de la paleta (una fase vieja) se muestra como «Otro (#rrggbb)», ya elegido.
export function SelectorDeColor({ valor, alElegir, idDelPrimero, error, deshabilitado }: Props) {
  const grupo = useId()
  const idDelError = `${grupo}-error`
  const colores = coloresParaElegir(valor)
  return (
    <fieldset
      className="grid min-w-0 gap-1.5"
      disabled={deshabilitado}
      aria-describedby={error ? idDelError : undefined}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Color</legend>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
        {colores.map((color, i) => (
          <label key={color.valor} className="min-w-0 cursor-pointer">
            <input
              id={i === 0 ? idDelPrimero : undefined}
              type="radio"
              name={grupo}
              value={color.valor}
              checked={color.valor.toLowerCase() === valor.toLowerCase()}
              className="peer sr-only"
              onChange={() => {
                alElegir(color.valor)
              }}
            />
            <span
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-sm) text-(--color-ink)',
                'peer-checked:border-(--color-primario) peer-checked:bg-(--color-surface-2)',
                'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-60',
              )}
            >
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-full border border-(--color-line)"
                style={{ backgroundColor: color.valor }}
              />
              <span className="min-w-0 break-words">{color.nombre}</span>
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={idDelError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
