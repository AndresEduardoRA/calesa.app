'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from 'cn'
import type { EnlaceDelMenu } from './enlaces'

// La sub-navegación de `/logistica`: Cadena y las áreas que ya tienen página. Marca la actual con `aria-current`.
export function SubNavegacion({ enlaces }: { enlaces: readonly EnlaceDelMenu[] }) {
  const ruta = usePathname()
  return (
    <nav aria-label="Logística" className="flex flex-wrap gap-1">
      {enlaces.map((enlace) => {
        const actual =
          enlace.ruta === ruta ||
          (enlace.ruta !== '/logistica' && ruta.startsWith(`${enlace.ruta}/`))
        return (
          <Link
            key={enlace.ruta}
            href={enlace.ruta as Route}
            aria-current={actual ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-(--radius-pill) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:min-h-8',
              actual && 'bg-(--color-surface) font-medium text-(--color-ink)',
            )}
          >
            {enlace.titulo}
          </Link>
        )
      })}
    </nav>
  )
}
