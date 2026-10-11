'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { estaEn } from './navegacion'

// Un renglón de la barra lateral. Es lo único de la barra que corre en el navegador: necesita
// la ruta actual para marcarse. La altura sale de la densidad (`--fila`), con piso táctil.
export function EnlaceNav({ ruta, children }: { ruta: string; children: ReactNode }) {
  const actual = usePathname()

  return (
    <Link
      // Las rutas de la navegación existen: lo garantiza navegacion.test.ts contra el disco.
      href={ruta as Route}
      aria-current={estaEn(actual, ruta) ? 'page' : undefined}
      className="flex h-(--fila) min-h-9 items-center gap-2.5 rounded-(--radius-md) px-2.5 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:bg-(--color-primario-soft) aria-[current=page]:font-medium aria-[current=page]:text-(--color-primario-ink) [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {children}
    </Link>
  )
}
