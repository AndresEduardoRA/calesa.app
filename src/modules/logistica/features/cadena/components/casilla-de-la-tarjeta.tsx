'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  nombre: string
  elegida: boolean
  alAlternar: () => void
}

// La casilla para mover en lote (6.04-3): de 44 px para el dedo, con el nombre de la unidad para quien lee con el lector de pantalla. Elegir no abre la tarjeta ni toca la URL.
export function CasillaDeLaTarjeta({ nombre, elegida, alAlternar }: Props) {
  return (
    <div className="flex min-h-11 min-w-11 shrink-0 items-start justify-center pt-3.5 md:min-h-0 md:min-w-6 md:pt-3.5">
      <Checkbox
        data-casilla
        aria-label={`Elegir ${nombre}`}
        checked={elegida}
        onCheckedChange={alAlternar}
      />
    </div>
  )
}
