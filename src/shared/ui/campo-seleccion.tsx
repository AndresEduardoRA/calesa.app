import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { Label } from './label'

type Opcion = { valor: string; etiqueta: string }

type Props = Omit<ComponentProps<'select'>, 'id' | 'children'> & {
  // Sirve de `id` y de `name`: el envío lee el formulario por nombre.
  nombre: string
  etiqueta: string
  opciones: readonly Opcion[]
  ayuda?: string
  error?: string
}

// Elegir una entre varias dentro de un formulario no controlado. Es un <select> nativo: se lee
// con `valoresDe()` como cualquier campo, y en el celular abre el selector del sistema.
export function CampoSeleccion({ nombre, etiqueta, opciones, ayuda, error, ...resto }: Props) {
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined
  const idError = error ? `${nombre}-error` : undefined
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ') || undefined

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <select
        id={nombre}
        name={nombre}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={cn(
          'h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm)',
          'focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-(--color-peligro)',
        )}
        {...resto}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
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
