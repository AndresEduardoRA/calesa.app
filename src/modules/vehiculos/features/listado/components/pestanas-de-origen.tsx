import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import type { OrigenResumen } from '@/modules/origenes/client'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'

type Props = {
  origenes: readonly OrigenResumen[]
  actual: string
}

// Una pestaña por origen donde la persona ve vehículos. Son enlaces limpios (`?origen=`): al
// cambiar de origen no se arrastran los filtros del anterior, que salen de otro layout. El nombre
// y el color vienen de la fila.
export function PestanasDeOrigen({ origenes, actual }: Props) {
  return (
    <nav aria-label="Orígenes" className="-mx-1 overflow-x-auto border-b border-(--color-line)">
      <ul className="flex min-w-max gap-1 px-1">
        {origenes.map((origen) => (
          <li key={origen.id}>
            <Link
              href={`${RUTAS.vehiculos}?origen=${origen.id}` as Route}
              aria-current={origen.id === actual ? 'page' : undefined}
              className={cn(
                '-mb-px flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-9',
                'aria-[current=page]:border-(--color-primario) aria-[current=page]:font-medium aria-[current=page]:text-(--color-ink)',
              )}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: origen.color }}
              />
              {origen.nombre}
              {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
