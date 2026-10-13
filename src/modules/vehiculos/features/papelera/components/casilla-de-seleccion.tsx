'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  elegida: boolean
  alCambiar: () => void
  // «Seleccionar Kia Morning»: la casilla no tiene texto a la vista.
  etiqueta: string
  deshabilitada?: boolean
}

// La casilla de una fila (o la de «todas»). El hueco alrededor la hace cómoda para el dedo.
export function CasillaDeSeleccion({ elegida, alCambiar, etiqueta, deshabilitada }: Props) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center md:size-7">
      <Checkbox
        aria-label={etiqueta}
        checked={elegida}
        disabled={deshabilitada}
        onCheckedChange={alCambiar}
      />
    </span>
  )
}
