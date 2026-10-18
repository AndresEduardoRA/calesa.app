'use client'

import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { Etiquetas } from '../hooks/use-etiquetas'

type Props = {
  etiquetas: Etiquetas
  alCrear: (etiqueta: Etiqueta) => void
  // Si hay algo escrito sin crear: el diálogo pregunta antes de cerrarse.
  alEscribir: (hayTexto: boolean) => void
}

// Crear una etiqueta desde «Gestionar»: el nombre y Enter. El color lo elige la base (el menos
// usado); se cambia después en su fila.
export function NuevaEtiqueta({ etiquetas, alCrear, alEscribir }: Props) {
  const [nombre, setNombre] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const hayTexto = nombre.trim() !== ''

  useEffect(() => {
    alEscribir(hayTexto)
    return () => {
      alEscribir(false)
    }
  }, [alEscribir, hayTexto])

  async function crear() {
    const creada = await etiquetas.crear(nombre)
    if (!creada.ok) {
      setMotivo(creada.motivo)
      return
    }
    setNombre('')
    alCrear(creada.etiqueta)
  }

  return (
    <form
      className="grid gap-1"
      onSubmit={(evento) => {
        evento.preventDefault()
        void crear()
      }}
    >
      <div className="flex gap-2">
        <Input
          value={nombre}
          aria-label="Nombre de la etiqueta nueva"
          aria-invalid={motivo ? true : undefined}
          aria-describedby={motivo ? 'motivo-nueva-etiqueta' : undefined}
          placeholder="Nueva etiqueta"
          maxLength={40}
          className="h-11 min-w-0 flex-1 md:h-9"
          onChange={(evento) => {
            setNombre(evento.target.value)
            setMotivo(null)
          }}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={etiquetas.creando}
          className="h-11 md:h-9"
        >
          <PlusIcon aria-hidden className="size-4" />
          Crear
        </Button>
      </div>
      {motivo ? (
        <p
          id="motivo-nueva-etiqueta"
          role="alert"
          className="text-(length:--text-xs) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
    </form>
  )
}
