'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'cn'
import { Table, TableCell, TableHead } from '../table'

// La tabla ancha de una lista: tan ancha como lo pidan sus columnas (el nombre nunca se achica para que quepan las demás), se
// desplaza de costado dentro de su tarjeta —nunca la página— y deja a la vista el nombre, pegado a la izquierda, y el «⋯», pegado a la
// derecha: una acción por fila nunca queda fuera de la vista. Las celdas pegadas son opacas, para que lo que pasa por debajo no se
// transparente, y toman el color de la fila al pasar el puntero, al estar abierta en el resumen o al tener el foco su botón.
export function TablaDeLista({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      <Table className="w-max min-w-full">{children}</Table>
    </div>
  )
}

type Lado = 'nombre' | 'acciones'

const PEGADA: Record<Lado, string> = {
  nombre:
    'sticky left-0 z-10 min-w-64 bg-(--color-surface) shadow-[inset_-1px_0_0_var(--color-line)]',
  acciones: 'sticky right-0 z-10 bg-(--color-surface) shadow-[inset_1px_0_0_var(--color-line)]',
}

const COLOR_DE_LA_FILA =
  'group-hover:bg-[color-mix(in_oklab,var(--color-surface-2)_50%,var(--color-surface))] group-data-[state=selected]:bg-(--color-surface-2) group-has-[[data-abre-resumen]:focus-visible]:bg-(--color-surface-2)'

export function CabeceraPegada({
  lado,
  className,
  ...props
}: ComponentProps<'th'> & { lado: Lado }) {
  return (
    <TableHead
      className={cn(
        lado === 'nombre' && 'pl-3',
        lado === 'acciones' && 'w-12 pr-2',
        PEGADA[lado],
        className,
      )}
      {...props}
    />
  )
}

export function CeldaPegada({ lado, className, ...props }: ComponentProps<'td'> & { lado: Lado }) {
  return (
    <TableCell
      className={cn(
        'py-1',
        lado === 'nombre' ? 'pl-3' : 'pr-2',
        PEGADA[lado],
        COLOR_DE_LA_FILA,
        className,
      )}
      {...props}
    />
  )
}
