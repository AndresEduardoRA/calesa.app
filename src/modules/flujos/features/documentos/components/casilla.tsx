'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  id: string
  etiqueta: string
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  ayuda?: string
}

// Una casilla con su etiqueta (clic en el texto también marca) y su ayuda; 44 px de alto en el celular.
export function Casilla({ id, etiqueta, marcada, alCambiar, ayuda }: Props) {
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="flex min-h-11 items-center gap-2 text-(length:--text-sm) md:min-h-0"
      >
        <Checkbox id={id} checked={marcada} onCheckedChange={alCambiar} />
        {etiqueta}
      </label>
      {ayuda ? <p className="text-(length:--text-sm) text-(--color-ink-faint)">{ayuda}</p> : null}
    </div>
  )
}
