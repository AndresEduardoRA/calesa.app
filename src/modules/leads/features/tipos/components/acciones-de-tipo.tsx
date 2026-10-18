'use client'

import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { TipoDeLeadConUso } from '../../../entities/tipo-de-lead'

type Props = {
  tipo: TipoDeLeadConUso
  // Por qué no se elimina (nulo = se puede): tiene leads, o es el último activo de su clase.
  motivo: string | null
  alEditar: () => void
  // Pide confirmar la eliminación (`?panel=eliminar-tipo`).
  alPedirEliminar: () => void
}

// «Editar» y «Eliminar» de un tipo. Eliminar está apagado y dice por qué si algún lead lo usa (ahí sólo se desactiva) o si es el
// último activo de su clase. Lo irreversible pide confirmar nombrando el tipo, en un diálogo con su URL.
export function AccionesDeTipo({ tipo, motivo, alEditar, alPedirEliminar }: Props) {
  const idMotivo = `tipo-${tipo.id}-motivo`

  return (
    <div className="order-3 ml-auto flex md:order-4 md:ml-0">
      <Button
        variant="outline"
        className="h-11 md:h-8"
        aria-label={`Editar ${tipo.nombre}`}
        onClick={alEditar}
      >
        <PencilIcon aria-hidden />
        Editar
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Eliminar ${tipo.nombre}`}
        data-eliminar-tipo={tipo.id}
        aria-describedby={motivo ? idMotivo : undefined}
        disabled={motivo !== null}
        title={motivo ?? undefined}
        onClick={alPedirEliminar}
      >
        <Trash2Icon aria-hidden />
      </Button>
      {motivo ? (
        <span id={idMotivo} className="sr-only">
          {motivo}
        </span>
      ) : null}
    </div>
  )
}
