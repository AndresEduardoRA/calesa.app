'use client'

import { Button } from '@/shared/ui/button'
import type { ElegidoDelBuscador } from './tipos-del-buscador'

type Props = {
  etiqueta: string
  elegido: ElegidoDelBuscador
  error?: string
  disabled: boolean
  alCambiar: () => void
}

// Lo elegido en un buscador: su nombre y «Cambiar».
export function ElegidoDeUnBuscador({ etiqueta, elegido, error, disabled, alCambiar }: Props) {
  return (
    <div className="grid gap-1.5">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">{etiqueta}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 break-words" data-elegido="">
          {elegido.titulo}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={alCambiar}>
          Cambiar
        </Button>
      </div>
      {error ? <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p> : null}
    </div>
  )
}
