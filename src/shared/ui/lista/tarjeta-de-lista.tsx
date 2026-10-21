'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { esClicPropio } from '@/shared/lib/clic-de-fila'

type Props = {
  // Sin él (una lista sin resumen, la del equipo) la tarjeta no es un objetivo de clic.
  alAbrir?: () => void
  abierta?: boolean
  // El «⋯» y, si la lista las tiene, la casilla: objetivos propios de la tarjeta, fuera de la zona que abre.
  acciones?: ReactNode
  children: ReactNode
}

// Una tarjeta de la lista en el celular. Mide lo que la pantalla (`min-w-0`) y es un `@container`: con el texto al 200 % la tarjeta
// mide menos de 16 rem y sus piezas se apilan en vez de ensanchar la página (`@max-[16rem]:…`). Un clic en cualquier parte la abre,
// salvo el de lo que tiene adentro (`esClicPropio`); con el teclado se alcanza el botón del nombre (`<AbrirResumen>`). Una `<ul>` de
// tarjetas es `grid-cols-[minmax(0,1fr)]`: una columna `auto` empujaría el «⋯» fuera de la vista.
export function TarjetaDeLista({ alAbrir, abierta = false, acciones, children }: Props) {
  return (
    <li className="min-w-0">
      <article
        data-state={abierta ? 'selected' : undefined}
        className={cn(
          '@container flex items-start rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) has-[[data-abre-resumen]:focus-visible]:bg-(--color-surface-2)',
          alAbrir && 'cursor-pointer',
          abierta && 'bg-(--color-surface-2)',
        )}
        onClick={
          alAbrir
            ? (evento) => {
                if (!esClicPropio(evento)) {
                  alAbrir()
                }
              }
            : undefined
        }
      >
        <div className="grid min-h-11 min-w-0 flex-1 gap-2 p-3">{children}</div>
        {acciones ? <div className="flex shrink-0 items-start p-1">{acciones}</div> : null}
      </article>
    </li>
  )
}
