'use client'

import { useId } from 'react'
import { Switch } from './switch'

type Props = {
  titulo: string
  // Qué hace, o por qué no se puede cambiar.
  ayuda: string
  valor: boolean
  alCambiar: (valor: boolean) => void
  deshabilitado?: boolean
}

// Un sí o no con su explicación al lado. El título es la etiqueta del interruptor. La columna del texto cede (`min-w-0`, `minmax(0, 1fr)`) y parte lo que no
// cabe (`break-words`): con el texto al 200 % en el celular su palabra más larga («activarla.») fijaba el mínimo y el interruptor se salía del relleno de su
// tarjeta (5a-25).
export function Interruptor({ titulo, ayuda, valor, alCambiar, deshabilitado }: Props) {
  const id = useId()
  return (
    <div data-slot="interruptor" className="flex items-start justify-between gap-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 break-words">
        <span id={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {titulo}
        </span>
        <span id={`${id}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {ayuda}
        </span>
      </div>
      <Switch
        aria-labelledby={id}
        aria-describedby={`${id}-ayuda`}
        checked={valor}
        disabled={deshabilitado}
        onCheckedChange={alCambiar}
      />
    </div>
  )
}
