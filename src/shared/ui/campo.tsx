import type { ComponentProps } from 'react'
import { Input } from './input'
import { Label } from './label'

type Props = Omit<ComponentProps<'input'>, 'id'> & {
  // Sirve de `id` y de `name`: el envío lee el formulario por nombre.
  nombre: string
  etiqueta: string
  ayuda?: string
  error?: string
}

// Campo de texto con su etiqueta, su ayuda y su error enlazados para el lector de pantalla.
// `aria-invalid` es además lo que busca `enfocarPrimerError()` después de un envío fallido.
export function Campo({ nombre, etiqueta, ayuda, error, ...resto }: Props) {
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined
  const idError = error ? `${nombre}-error` : undefined
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ') || undefined

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Input
        id={nombre}
        name={nombre}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className="h-11 md:h-9"
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
