'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import { rutaDeLaHoja } from '../../../entities/ruta-de-la-hoja'

type Props = {
  origenes: readonly { id: string; nombre: string; color: string }[]
  actual: string
  leadId: string | null
}

// Una pestaña por origen donde la persona cotiza. Los nombres y colores salen de la fila del origen. Son enlaces: cambiar de origen vuelve a leer la hoja de ese
// origen (cada una tiene su fórmula). Se desplaza de costado con la pista de que sigue.
export function PestanasDeOrigen({ origenes, actual, leadId }: Props) {
  const lista = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(lista)
  return (
    <nav aria-label="Orígenes" className="relative min-w-0 border-b border-(--color-line)">
      <ul ref={lista} className="-mb-px flex gap-1 overflow-x-auto">
        {origenes.map((origen) => (
          <li key={origen.id}>
            <Link
              href={rutaDeLaHoja({ origen: origen.id, lead: leadId }) as Route}
              prefetch={false}
              aria-current={origen.id === actual ? 'page' : undefined}
              className="flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:border-(--color-primario) aria-[current=page]:font-medium aria-[current=page]:text-(--color-ink) md:min-h-9"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: origen.color }}
              />
              {origen.nombre}
            </Link>
          </li>
        ))}
      </ul>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
