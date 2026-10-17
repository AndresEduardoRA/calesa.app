'use client'

import { conteoCorto } from '@/shared/lib/conteo'
import { useRegional } from '@/shared/ui/regional'
import type { Columna } from '../../../entities/tablero'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'

type Props = {
  columnas: readonly Columna[]
  // La etapa elegida (su columna es la que se ve) y qué pasa al elegir otra.
  elegida: string | null
  alElegir: (id: string) => void
}

// Las etapas del celular: una pestaña por etapa, con su conteo; la columna elegida es la única que se dibuja.
export function PestanasDeEtapas({ columnas, elegida, alElegir }: Props) {
  const { locale } = useRegional()
  return (
    <div role="tablist" aria-label="Etapas" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
      {columnas.map((c) => {
        const activa = c.etapa.id === elegida
        return (
          <button
            key={c.etapa.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => {
              alElegir(c.etapa.id)
            }}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--radius-pill) border px-3 text-(length:--text-sm) ${
              activa
                ? 'border-(--color-primario) bg-(--color-primario-soft) text-(--color-primario-ink)'
                : 'border-(--color-line) text-(--color-ink-soft)'
            }`}
          >
            <PuntoDeColor color={c.etapa.color} className="size-2.5" />
            {c.etapa.nombre}
            <span className="tabular-nums">{conteoCorto(c.total, { locale })}</span>
          </button>
        )
      })}
    </div>
  )
}
