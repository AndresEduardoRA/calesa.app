'use client'

import { Button } from '@/shared/ui/button'
import { avisoDelPeso } from '../../../entities/documentos/admision'
import { formatearBytes } from '../../../entities/documentos/tamano'
import type { EntradaDeLaBandeja } from '../hooks/use-bandeja'

type Props = {
  entrada: EntradaDeLaBandeja
  // Por qué no se pudo subir la última vez, si falló.
  motivo?: string
  deshabilitado: boolean
  alQuitar: () => void
}

// Un archivo de la bandeja: su nombre, su peso, el aviso si es pesado y «Quitar». Todavía no se subió: sale de la lista sin dejar rastro.
export function FilaDeLaBandeja({ entrada, motivo, deshabilitado, alQuitar }: Props) {
  const { nombre, bytes } = entrada.datos
  const aviso = avisoDelPeso(bytes)
  return (
    <li className="grid gap-1 rounded-(--radius-md) border border-(--color-line) px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{nombre}</p>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{formatearBytes(bytes)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-9"
          aria-label={`Quitar ${nombre}`}
          disabled={deshabilitado}
          onClick={alQuitar}
        >
          Quitar
        </Button>
      </div>
      {aviso ? <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{aviso}</p> : null}
      {motivo ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </li>
  )
}
