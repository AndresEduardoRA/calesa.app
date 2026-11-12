'use client'

import { useId } from 'react'
import { Checkbox } from '@/shared/ui/checkbox'
import type { RolLeido } from '../../../entities/lectura-de-fase'

type Props = {
  legend: string
  ayuda: string
  roles: readonly RolLeido[]
  marcados: readonly string[]
  alMarcar: (rolId: string, marcado: boolean) => void
  deshabilitado?: boolean
  error?: string
}

// Los roles que acotan quién mueve, una casilla cada uno. Vacío no acota: la ayuda dice quién mueve entonces. Marcar toca sólo ese rol (los que el selector
// no muestra, si hay más de 100, se conservan).
export function SelectorDeRoles({
  legend,
  ayuda,
  roles,
  marcados,
  alMarcar,
  deshabilitado,
  error,
}: Props) {
  const id = useId()
  const descritoPor = [error ? `${id}-error` : null, `${id}-ayuda`].filter(Boolean).join(' ')
  return (
    <fieldset
      aria-describedby={descritoPor}
      aria-invalid={error ? true : undefined}
      className="grid min-w-0 gap-1 border-0 p-0"
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        {legend}
      </legend>
      {roles.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">No hay roles para elegir.</p>
      ) : (
        roles.map((rol) => (
          <label
            key={rol.id}
            htmlFor={`${id}-${rol.id}`}
            className="flex min-h-11 items-center gap-2 text-(length:--text-sm) break-words md:min-h-0"
          >
            <Checkbox
              id={`${id}-${rol.id}`}
              checked={marcados.includes(rol.id)}
              disabled={deshabilitado}
              onCheckedChange={(marcada) => {
                alMarcar(rol.id, marcada)
              }}
            />
            {rol.nombre}
          </label>
        ))
      )}
      {error ? (
        <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      <p id={`${id}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
        {ayuda}
      </p>
    </fieldset>
  )
}
