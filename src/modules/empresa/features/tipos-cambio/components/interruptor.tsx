'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'

type Props = {
  titulo: string
  // Qué hace, o por qué no se puede cambiar.
  ayuda: string
  valor: boolean
  alCambiar: (valor: boolean) => void
  deshabilitado?: boolean
}

// Un sí o no con su explicación al lado. El título es la etiqueta del interruptor.
export function Interruptor({ titulo, ayuda, valor, alCambiar, deshabilitado }: Props) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
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
