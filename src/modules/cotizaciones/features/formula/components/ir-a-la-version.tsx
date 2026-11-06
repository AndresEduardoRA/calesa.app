'use client'

import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cursorDeIrA } from '../../../entities/formula/versiones'

type Props = {
  // Recibe el cursor (la versión + 1).
  alIr: (cursor: number) => void
  deshabilitado: boolean
}

// El camino a lo antiguo de la lista de versiones, en su tope: leer desde una versión hacia atrás.
export function IrALaVersion({ alIr, deshabilitado }: Props) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const texto = new FormData(evento.currentTarget).get('version')
    const cursor = cursorDeIrA(typeof texto === 'string' ? texto : '')
    if (!cursor.ok) {
      setError(cursor.error.mensaje)
      return
    }
    setError(null)
    alIr(cursor.data)
  }
  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Ir a la versión</Label>
        <Input
          id={id}
          name="version"
          inputMode="numeric"
          autoComplete="off"
          className="w-32"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={deshabilitado}
      >
        Ir
      </Button>
      {error ? (
        <p
          id={`${id}-error`}
          className="basis-full text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
