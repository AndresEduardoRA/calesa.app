'use client'

import { cn } from 'cn'
import type { ModoDelListado } from '../../../entities/alcance'
import { useAlcanceDelListado } from '../hooks/use-alcance-del-listado'

const OPCIONES: readonly { modo: ModoDelListado; etiqueta: string }[] = [
  { modo: 'mios', etiqueta: 'Míos' },
  { modo: 'todos', etiqueta: 'Todos' },
]

// «Míos | Todos»: sólo se dibuja para quien tiene `leads.ver` con alcance «todos». Cambiar de modo
// vuelve a la primera página. «Míos» no escribe nada en la URL: es lo de siempre.
export function SelectorDeAlcance({ modo }: { modo: ModoDelListado }) {
  const alcance = useAlcanceDelListado()
  return (
    <div
      role="group"
      aria-label="Qué leads ver"
      className="inline-flex rounded-(--radius-md) border border-(--color-line) p-0.5"
    >
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.modo}
          type="button"
          aria-pressed={modo === opcion.modo}
          className={cn(
            'h-10 rounded-(--radius-sm) px-3 text-(length:--text-sm) font-medium outline-none focus-visible:shadow-(--shadow-focus) md:h-8',
            modo === opcion.modo
              ? 'bg-primary text-primary-foreground'
              : 'text-(--color-ink-soft) hover:text-(--color-ink)',
          )}
          onClick={() => {
            alcance.cambiar(opcion.modo)
          }}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
