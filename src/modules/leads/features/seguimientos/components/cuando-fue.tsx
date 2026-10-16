'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'

type Props = {
  nombre: string
  // `aaaa-mm-ddThh:mm` en la zona de la empresa; vacío = «ahora» (sólo al anotar).
  valor: string
  alCambiar: (valor: string) => void
  error?: string | undefined
  deshabilitado: boolean
  // Al anotar nace en «Ahora»; al editar, con la fecha que tiene.
  nuevo: boolean
}

// «Ahora» por defecto al anotar; «Otra fecha» abre el campo para algo que ya pasó. Una fecha que trae
// el borrador o un motivo lo abren solos. Una fecha futura la rechaza la validación, no el campo.
export function CuandoFue({ nombre, valor, alCambiar, error, deshabilitado, nuevo }: Props) {
  const [elegida, setElegida] = useState(false)
  if (nuevo && !elegida && (valor !== '' || error !== undefined)) {
    setElegida(true)
  }
  const abierta = !nuevo || elegida
  const pedirFoco = useRef(false)
  useEffect(() => {
    if (abierta && pedirFoco.current) {
      pedirFoco.current = false
      document.getElementById(nombre)?.focus()
    }
  }, [abierta, nombre])

  if (!abierta) {
    return (
      <div className="grid gap-1.5">
        <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Cuándo fue</span>
        <div className="flex items-center gap-2">
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">Ahora</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              pedirFoco.current = true
              setElegida(true)
            }}
            disabled={deshabilitado}
          >
            Otra fecha
          </Button>
        </div>
      </div>
    )
  }
  return (
    <Campo
      nombre={nombre}
      etiqueta="Cuándo fue"
      type="datetime-local"
      value={valor}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      disabled={deshabilitado}
    />
  )
}
