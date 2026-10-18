'use client'

import { useId } from 'react'
import { cn } from 'cn'
import {
  CLASES_DE_TIPO,
  EXPLICACION_DE_CLASE,
  NOMBRE_DE_CLASE,
  type ClaseDeTipoDeLead,
} from '../../../entities/tipo-de-lead'

type Props = {
  valor: ClaseDeTipoDeLead | null
  alElegir: (clase: ClaseDeTipoDeLead) => void
  error?: string | undefined
  // Una clase que no se elige no se pierde: el que se edita muestra la suya, quieta (no cambia nunca).
  fija?: boolean
  // El `id` del primer radio: a donde va el foco si falta la clase.
  idDelPrimero: string
}

// La clase de un tipo: «Prospecto» (todavía no compró) o «Cliente» (ya compró). Se elige al crearlo y no cambia. Son radios
// nativos en dos tarjetas con su explicación: las flechas, el foco y el lector de pantalla funcionan sin escribir nada.
export function SelectorDeClase({ valor, alElegir, error, fija = false, idDelPrimero }: Props) {
  const grupo = useId()
  const idDelError = `${grupo}-error`
  return (
    <fieldset
      className="grid min-w-0 gap-1.5"
      disabled={fija}
      aria-describedby={error ? idDelError : undefined}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Clase</legend>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {CLASES_DE_TIPO.map((clase, n) => (
          <label key={clase} className="min-w-0 cursor-pointer">
            <input
              id={n === 0 ? idDelPrimero : undefined}
              aria-invalid={n === 0 && error ? true : undefined}
              type="radio"
              name={grupo}
              value={clase}
              checked={valor === clase}
              className="peer sr-only"
              onChange={() => {
                alElegir(clase)
              }}
            />
            <span
              className={cn(
                'grid min-h-11 gap-0.5 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2',
                'peer-checked:border-(--color-primario) peer-checked:bg-(--color-surface-2)',
                'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-60',
                error && valor === null && 'border-(--color-peligro)',
              )}
            >
              <span className="text-(length:--text-base) font-medium text-(--color-ink)">
                {NOMBRE_DE_CLASE[clase]}
              </span>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                {EXPLICACION_DE_CLASE[clase]}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {fija
          ? 'La clase se elige al crear el tipo y no se cambia.'
          : 'No se puede cambiar después: si te equivocas, crea otro tipo.'}
      </p>
      {error ? (
        <p id={idDelError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
