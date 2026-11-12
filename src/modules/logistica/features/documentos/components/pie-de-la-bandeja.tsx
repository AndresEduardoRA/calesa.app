'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

type Props = {
  error?: string
  avance: { actual: number; total: number } | null
  texto: string
  deshabilitado: boolean
}

// El pie de la bandeja: lo que falta, el avance «2 de 3» mientras sube y el botón de subir o de reintentar.
export function PieDeLaBandeja({ error, avance, texto, deshabilitado }: Props) {
  return (
    <>
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
      {avance ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Subiendo {avance.actual} de {avance.total}…
        </p>
      ) : null}
      <div>
        <Button type="submit" className="min-h-11 md:min-h-9" disabled={deshabilitado}>
          {texto}
        </Button>
      </div>
    </>
  )
}
