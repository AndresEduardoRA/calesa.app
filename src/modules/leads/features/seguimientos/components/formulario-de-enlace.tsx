'use client'

import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  actual: string | null
  alAplicar: (href: string) => void
  alQuitar: () => void
  alCerrar: () => void
  validar: (href: string) => string | null
}

// Una dirección sin protocolo se toma como web («ejemplo.com» → «https://ejemplo.com»); un correo
// suelto, como correo.
function completar(escrito: string): string {
  const limpio = escrito.trim()
  if (/^[a-z][a-z0-9+.-]*:/i.test(limpio)) {
    return limpio
  }
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio) ? `mailto:${limpio}` : `https://${limpio}`
}

// La dirección de un enlace, en línea bajo la barra: Enter aplica y Esc cierra sin tocar nada.
export function FormularioDeEnlace({ actual, alAplicar, alQuitar, alCerrar, validar }: Props) {
  const id = useId()
  const [escrito, setEscrito] = useState(actual ?? '')
  const [motivo, setMotivo] = useState<string | null>(null)
  function aplicar() {
    const href = validar(completar(escrito))
    if (href === null) {
      setMotivo('Usa una dirección web, un correo (mailto:) o un teléfono (tel:).')
      return
    }
    alAplicar(href)
  }
  return (
    <div className="grid gap-1.5 border-t border-(--color-line) p-2">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Dirección del enlace
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          autoFocus
          inputMode="url"
          autoComplete="off"
          value={escrito}
          aria-invalid={motivo ? true : undefined}
          aria-describedby={motivo ? `${id}-motivo` : undefined}
          className="min-h-11 min-w-48 flex-1 md:min-h-8"
          onChange={(evento) => {
            setEscrito(evento.target.value)
            setMotivo(null)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              aplicar()
            } else if (evento.key === 'Escape') {
              evento.preventDefault()
              evento.stopPropagation()
              alCerrar()
            }
          }}
        />
        <Button type="button" size="sm" className="min-h-11 md:min-h-8" onClick={aplicar}>
          Aplicar
        </Button>
        {actual ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-8"
            onClick={alQuitar}
          >
            Quitar enlace
          </Button>
        ) : null}
      </div>
      {motivo ? (
        <p id={`${id}-motivo`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
