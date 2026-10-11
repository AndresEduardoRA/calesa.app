import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

// Enlace de texto entre las pantallas de acceso, con alto suficiente para el dedo.
export function EnlaceAcceso({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-(--radius-sm) text-(length:--text-sm) font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
    >
      {children}
    </Link>
  )
}
