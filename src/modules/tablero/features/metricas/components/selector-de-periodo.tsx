import type { Route } from 'next'
import Link from 'next/link'
import { PERIODOS, etiquetaDelPeriodo, type Periodo } from '../../../entities/periodo'

// Tres enlaces, sin JS: cambiar de período es una navegación. «Este mes» es la URL limpia.
export function SelectorDePeriodo({ activo }: { activo: Periodo }) {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-2">
      {PERIODOS.map((periodo) => {
        const esActivo = periodo === activo
        return (
          <Link
            key={periodo}
            href={(periodo === 'mes' ? '/tablero' : `/tablero?periodo=${periodo}`) as Route}
            scroll={false}
            aria-current={esActivo ? 'page' : undefined}
            className={`flex min-h-11 items-center rounded-(--radius-control) border px-3 text-(length:--text-sm) md:min-h-9 ${
              esActivo
                ? 'border-(--color-primario) bg-(--color-surface-muted) font-medium text-(--color-ink)'
                : 'border-(--color-line) text-(--color-ink-soft) hover:bg-(--color-surface-muted)'
            }`}
          >
            {etiquetaDelPeriodo(periodo)}
          </Link>
        )
      })}
    </nav>
  )
}
