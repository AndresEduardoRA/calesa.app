'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { CLAVE_DE_ORIGEN_DE_LA_CADENA } from '../../../entities/cadena/filtros'
import type { OrigenDeLaCadena } from '../../../entities/cadena/origenes'
import { RUTAS } from '@/shared/lib/rutas'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'

type Props = {
  origenes: readonly OrigenDeLaCadena[]
  actual: string
}

// Una pestaña por origen con la logística encendida donde la persona la ve. Nombres y colores salen de la fila del origen. Son enlaces: cambiar de origen vuelve a leer su cadena y no conserva
// filtros, fase ni panel (no son los mismos). Con un solo origen no hay dónde cambiar.
export function PestanasDeOrigen({ origenes, actual }: Props) {
  const lista = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(lista)
  if (origenes.length < 2) {
    return null
  }
  return (
    <nav aria-label="Orígenes" className="relative min-w-0 border-b border-(--color-line)">
      <ul ref={lista} className="-mb-px flex gap-1 overflow-x-auto">
        {origenes.map((origen) => (
          <li key={origen.id}>
            <Link
              href={`${RUTAS.logistica}?${CLAVE_DE_ORIGEN_DE_LA_CADENA}=${origen.id}` as Route}
              prefetch={false}
              aria-current={origen.id === actual ? 'page' : undefined}
              className="flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:border-(--color-primario) aria-[current=page]:font-medium aria-[current=page]:text-(--color-ink) md:min-h-9"
            >
              {origen.color ? (
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: origen.color }}
                />
              ) : null}
              {origen.nombre}
            </Link>
          </li>
        ))}
      </ul>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
