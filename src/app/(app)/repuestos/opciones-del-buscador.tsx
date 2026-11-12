'use client'

import { cn } from 'cn'
import type { OpcionDelBuscador } from './tipos-del-buscador'

type Props = {
  id: string
  etiqueta: string
  opciones: readonly OpcionDelBuscador[]
  activa: number
  idDeLaOpcion: (i: number) => string
  alElegir: (opcion: OpcionDelBuscador) => void
}

// La lista de un combobox: se elige con el clic (sin quitar el foco al campo) o con el teclado.
export function OpcionesDelBuscador({
  id,
  etiqueta,
  opciones,
  activa,
  idDeLaOpcion,
  alElegir,
}: Props) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={etiqueta}
      className="max-h-60 overflow-y-auto rounded-lg border border-(--color-line-strong) bg-(--color-surface)"
    >
      {opciones.map((opcion, i) => (
        <li
          key={opcion.id}
          id={idDeLaOpcion(i)}
          role="option"
          aria-selected={i === activa}
          className={cn(
            'min-h-11 cursor-pointer px-3 py-2 md:min-h-9',
            i === activa && 'bg-(--color-surface-sunken)',
          )}
          onMouseDown={(evento) => {
            evento.preventDefault()
            alElegir(opcion)
          }}
        >
          <span className="block break-words">{opcion.titulo}</span>
          {opcion.apoyo ? (
            <span className="block text-(length:--text-xs) break-words text-(--color-ink-soft)">
              {opcion.apoyo}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
