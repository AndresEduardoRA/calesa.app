'use client'

import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { esClicPropio } from '@/shared/lib/clic-de-fila'
import { TableRow } from '../table'

type Props = Omit<ComponentProps<'tr'>, 'onClick'> & {
  // Abre el resumen de la fila.
  alAbrir: () => void
  // Su resumen está abierto: la fila se marca.
  abierta?: boolean
}

// Una fila de la tabla de una lista. Un clic en cualquier parte la abre, salvo el de lo que tiene adentro: una casilla, el «⋯», un
// enlace o un botón propio (`esClicPropio`). Con el teclado se alcanza el botón del nombre (`<AbrirResumen>`) y Enter la abre; la fila
// entera toma el color de abierta cuando ese botón tiene el foco.
export function FilaDeLista({ alAbrir, abierta = false, className, ...props }: Props) {
  return (
    <TableRow
      data-state={abierta ? 'selected' : undefined}
      className={cn('group h-(--fila) cursor-pointer', className)}
      onClick={(evento) => {
        if (!esClicPropio(evento)) {
          alAbrir()
        }
      }}
      {...props}
    />
  )
}
