'use client'

import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { esClicPropio } from '@/shared/lib/clic-de-fila'
import { TableRow } from '../table'
import { CLASES_DE_VISTO, useVistoDeLista } from './visto'

type Props = Omit<ComponentProps<'tr'>, 'onClick'> & {
  // Abre el resumen de la fila. Una lista sin resumen (la del equipo) no lo pasa: la fila no promete un clic que no hace nada.
  alAbrir?: () => void
  // Su resumen está abierto: la fila se marca.
  abierta?: boolean
  // El id del registro, para su marca de «visto» (abierto antes en este módulo: el nombre se apaga) o «último visto» (borde de acento).
  idDeVisto?: string
}

// Una fila de la tabla de una lista. Un clic en cualquier parte la abre, salvo el de lo que tiene adentro: una casilla, el «⋯», un
// enlace o un botón propio (`esClicPropio`). Con el teclado se alcanza el botón del nombre (`<AbrirResumen>`) y Enter la abre; la fila
// entera toma el color de abierta cuando ese botón tiene el foco.
export function FilaDeLista({ alAbrir, abierta = false, idDeVisto, className, ...props }: Props) {
  const visto = useVistoDeLista(idDeVisto)
  return (
    <TableRow
      data-state={abierta ? 'selected' : undefined}
      data-visto={visto ?? undefined}
      className={cn('group h-(--fila)', alAbrir && 'cursor-pointer', CLASES_DE_VISTO, className)}
      onClick={
        alAbrir
          ? (evento) => {
              if (!esClicPropio(evento)) {
                alAbrir()
              }
            }
          : undefined
      }
      {...props}
    />
  )
}
