'use client'

import { LayoutGridIcon, Rows3Icon, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'

const OPCIONES: readonly { vista: VistaDeLista; etiqueta: string; Icono: LucideIcon }[] = [
  { vista: 'tabla', etiqueta: 'Tabla', Icono: Rows3Icon },
  { vista: 'tarjetas', etiqueta: 'Tarjetas', Icono: LayoutGridIcon },
]

type Props = {
  vista: VistaDeLista
  alCambiar: (vista: VistaDeLista) => void
}

// «Tabla | Tarjetas» arriba de una lista (`<UnaSolaVista preferida>`). Sólo en escritorio: por debajo del corte siempre van las
// tarjetas y no hay nada que elegir. Cada botón dice su nombre con texto, no sólo con el ícono.
export function ConmutadorDeVista({ vista, alCambiar }: Props) {
  return (
    <div
      role="group"
      aria-label="Cómo ver la lista"
      className="hidden rounded-(--radius-md) border border-(--color-line) p-0.5 md:inline-flex"
    >
      {OPCIONES.map(({ vista: opcion, etiqueta, Icono }) => (
        <button
          key={opcion}
          type="button"
          aria-pressed={vista === opcion}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-(--radius-sm) px-2.5 text-(length:--text-sm) font-medium outline-none focus-visible:shadow-(--shadow-focus)',
            vista === opcion
              ? 'bg-primary text-primary-foreground'
              : 'text-(--color-ink-soft) hover:text-(--color-ink)',
          )}
          onClick={() => {
            if (vista !== opcion) alCambiar(opcion)
          }}
        >
          <Icono aria-hidden className="size-4" />
          {etiqueta}
        </button>
      ))}
    </div>
  )
}
