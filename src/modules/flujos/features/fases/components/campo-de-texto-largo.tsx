'use client'

import type { ComponentProps } from 'react'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

type Props = Omit<ComponentProps<'textarea'>, 'id'> & {
  // Sirve de `id` y de `name`.
  nombre: string
  etiqueta: string
  ayuda?: string
  error?: string | undefined
}

// Un texto de varias líneas con su etiqueta, su ayuda y su error enlazados, como `Campo` pero con `<Textarea>`.
export function CampoDeTextoLargo({ nombre, etiqueta, ayuda, error, ...resto }: Props) {
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined
  const idError = error ? `${nombre}-error` : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Textarea
        id={nombre}
        name={nombre}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idError, idAyuda].filter(Boolean).join(' ') || undefined}
        {...resto}
      />
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}
