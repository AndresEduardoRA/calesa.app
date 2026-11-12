'use client'

import { useRef } from 'react'
import { claveDeColumna, numeroDeLaColumna } from '../../../entities/cadena/columna'
import type { ColumnaDeLaCadena } from '../../../entities/cadena/leer'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import { frasePorColumna } from './columna-de-la-cadena'

type Props = {
  columnas: readonly ColumnaDeLaCadena[]
  // La clave de la fase elegida (su columna es la que se ve) y qué pasa al elegir otra.
  elegida: string | null
  alElegir: (clave: string) => void
}

// Las fases del celular: una pestaña por fase, con su número y su color; la columna elegida es la única que se dibuja. Cambiar de pestaña no vuelve a leer: sólo cambia `?fase=`.
export function PestanasDeFases({ columnas, elegida, alElegir }: Props) {
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  return (
    <div className="relative -mx-4 min-w-0">
      <div
        ref={lista}
        role="tablist"
        aria-label="Fases"
        className="flex gap-1 overflow-x-auto px-4 pb-1"
      >
        {columnas.map((c) => {
          const clave = claveDeColumna(c.faseId)
          const activa = clave === elegida
          return (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={activa}
              aria-label={`${c.nombre ?? 'Sin fase'}: ${frasePorColumna(c)}`}
              onClick={() => {
                alElegir(clave)
              }}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--radius-pill) border px-3 text-(length:--text-sm) transition ${
                activa
                  ? 'border-(--color-primario) bg-(--color-primario-soft) text-(--color-primario-ink)'
                  : 'border-(--color-line) text-(--color-ink-soft)'
              }`}
            >
              {c.color ? (
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
              ) : null}
              {c.nombre ?? 'Sin fase'}
              <span className="tabular-nums">{numeroDeLaColumna(c)}</span>
            </button>
          )
        })}
      </div>
      <PistaDeDesborde {...desborde} />
    </div>
  )
}
