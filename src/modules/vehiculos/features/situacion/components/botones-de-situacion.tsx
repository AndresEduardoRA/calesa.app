'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { AccionesDeSituacion } from '../../../entities/situacion'

export const CLASE_DE_BOTON = 'min-h-11 md:min-h-8'

type Props = {
  acciones: AccionesDeSituacion
  hrefLaGanamos: string
  enviando: boolean
  // «No la ganamos» (true) o «Deshacer» (false).
  alMarcar: (noGanada: boolean) => void
}

// «La ganamos» (un enlace al mover de logística) y «No la ganamos» o «Deshacer», según lo que la situación ofrece. Mientras guarda, apagado.
export function BotonesDeSituacion({ acciones, hrefLaGanamos, enviando, alMarcar }: Props) {
  const marca = acciones.noLaGanamos || acciones.deshacer
  if (!acciones.laGanamos && !marca) return null
  const textoDeMarca = acciones.noLaGanamos ? 'No la ganamos' : 'Deshacer'
  return (
    <div className="flex flex-wrap gap-2">
      {acciones.laGanamos ? (
        <Link
          href={hrefLaGanamos as Route}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: CLASE_DE_BOTON })}
        >
          La ganamos
        </Link>
      ) : null}
      {marca ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={CLASE_DE_BOTON}
          disabled={enviando}
          onClick={() => {
            alMarcar(acciones.noLaGanamos)
          }}
        >
          {enviando ? 'Guardando…' : textoDeMarca}
        </Button>
      ) : null}
    </div>
  )
}
