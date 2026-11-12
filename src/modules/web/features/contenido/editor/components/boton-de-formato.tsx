'use client'

import type { LucideIcon } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { Button } from '@/shared/ui/button'

export function BotonDeFormato({
  etiqueta,
  Icono,
  activo,
  alPulsar,
  deshabilitado,
  parada,
  alEnfocar,
}: {
  etiqueta: string
  Icono: LucideIcon
  activo: boolean
  alPulsar: () => void
  deshabilitado: boolean
  // La barra tiene una sola parada de Tab (la del botón con `parada`); las flechas recorren el resto.
  parada: boolean
  alEnfocar: () => void
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={activo ? 'secondary' : 'ghost'}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      tabIndex={parada ? 0 : -1}
      onFocus={alEnfocar}
      className="size-11 md:size-8"
      // Que el editor no pierda la selección al tocar el botón.
      onMouseDown={(evento) => {
        evento.preventDefault()
      }}
      onClick={alPulsar}
      disabled={deshabilitado}
    >
      <Icono aria-hidden className="size-4" />
    </Button>
  )
}

// Las flechas, Inicio y Fin recorren los botones de la barra (el patrón «toolbar» de WAI-ARIA): con Tab se entra y se sale en una sola parada.
export function moverEnLaBarra(evento: KeyboardEvent<HTMLDivElement>) {
  const claves = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!claves.includes(evento.key)) {
    return
  }
  const botones = Array.from(
    evento.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  )
  const actual = botones.findIndex((boton) => boton === document.activeElement)
  if (actual < 0) {
    return
  }
  const ultimo = botones.length - 1
  const destino =
    evento.key === 'Home'
      ? 0
      : evento.key === 'End'
        ? ultimo
        : evento.key === 'ArrowRight'
          ? (actual + 1) % botones.length
          : (actual - 1 + botones.length) % botones.length
  evento.preventDefault()
  botones[destino]?.focus()
}
