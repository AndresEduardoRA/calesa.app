'use client'

import { XIcon } from 'lucide-react'
import { chipsDe, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { Button } from '../button'
import { useRegional } from '../regional'
import { useFiltrosDelListado } from './contexto'

// Lo que está filtrando, a la vista: cada chip se quita solo, y «Limpiar» los quita todos.
export function ChipsDeFiltros({ esquema }: { esquema: EsquemaDeFiltros }) {
  const estado = useFiltrosDelListado()
  const { locale, zonaHoraria } = useRegional()
  const chips = chipsDe(esquema, estado.valores, { locale, zona: zonaHoraria })
  if (chips.length === 0) {
    return null
  }
  return (
    <ul aria-label="Filtros activos" className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.id}>
          <button
            type="button"
            aria-label={`Quitar el filtro ${chip.texto}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-(--color-line-strong) bg-(--color-surface) px-3 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) md:min-h-7 md:px-2.5"
            onClick={() => {
              estado.aplicar(chip.alQuitar)
            }}
          >
            <span className="max-w-56 truncate">{chip.texto}</span>
            <XIcon aria-hidden className="size-3.5 shrink-0 text-(--color-ink-faint)" />
          </button>
        </li>
      ))}
      <li>
        <Button variant="ghost" size="sm" className="min-h-11 md:min-h-7" onClick={estado.limpiar}>
          Limpiar
        </Button>
      </li>
    </ul>
  )
}
