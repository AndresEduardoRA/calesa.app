'use client'

import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { motivoParaNoEliminar, type OrigenDeLeadConUso } from '../../../entities/origen-de-lead'

type Props = {
  origen: OrigenDeLeadConUso
  alEditar: () => void
  // Pide confirmar la eliminación (`?panel=eliminar-origen`).
  alPedirEliminar: () => void
}

// «Editar» y «Eliminar» de un origen. Eliminar está apagado y dice por qué si algún lead lo usa: ahí
// sólo se desactiva. Lo irreversible pide confirmar nombrando el origen, en un diálogo con su URL.
export function AccionesDeOrigen({ origen, alEditar, alPedirEliminar }: Props) {
  const motivo = motivoParaNoEliminar(origen)
  const idMotivo = `origen-${origen.id}-motivo`

  return (
    <div className="order-3 ml-auto flex md:order-4 md:ml-0">
      <Button
        variant="outline"
        className="h-11 md:h-8"
        aria-label={`Editar ${origen.nombre}`}
        onClick={alEditar}
      >
        <PencilIcon aria-hidden />
        Editar
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Eliminar ${origen.nombre}`}
        data-eliminar-origen={origen.id}
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
