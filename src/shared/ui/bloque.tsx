'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from 'cn'

type Props = {
  titulo: string
  descripcion?: string
  // Los bloques secundarios nacen plegados: el formulario muestra primero lo imprescindible.
  plegado?: boolean
  className?: string
  children: ReactNode
}

// Sección plegable de un formulario o de una ficha. Es un <details> nativo: funciona con teclado
// y lector de pantalla sin nada extra, y lo plegado sigue en el DOM (no se pierde lo tipeado ni
// deja de enviarse con el formulario).
export function Bloque({ titulo, descripcion, plegado = false, className, children }: Props) {
  const [abierto, setAbierto] = useState(!plegado)

  return (
    <details
      open={abierto}
      onToggle={(evento) => {
        setAbierto(evento.currentTarget.open)
      }}
      className={cn(
        'group rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)',
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-(--radius-card) px-4 py-2.5 outline-none select-none focus-visible:shadow-(--shadow-focus) [&::-webkit-details-marker]:hidden">
        <span className="grid gap-0.5">
          <span className="text-(length:--text-base) font-medium text-(--color-ink)">{titulo}</span>
          {descripcion ? (
            <span className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</span>
          ) : null}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 shrink-0 text-(--color-ink-faint) transition-transform duration-(--dur-rapida) group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-4 border-t border-(--color-line) p-4">{children}</div>
    </details>
  )
}
