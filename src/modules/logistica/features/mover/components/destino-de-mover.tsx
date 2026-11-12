'use client'

import type { DestinoConVista } from '@/modules/flujos/client'
import { Aviso } from '@/shared/ui/aviso'
import { RequisitosDeUnDestino } from './requisitos-de-un-destino'

type Props = {
  destino: DestinoConVista
}

// Un destino posible de la unidad: la fase a la que puede ir y lo que esa fase le pide, con lo que cumple y lo que falta. Si la vista previa de este destino no se pudo leer, lo dice aquí y no
// tumba a los demás.
export function DestinoDeMover({ destino }: Props) {
  return (
    <li
      className="grid gap-3 rounded-(--radius-md) border border-(--color-line) p-3"
      data-destino={destino.faseId}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: destino.color }}
        />
        <h3 className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)">
          {destino.nombre}
        </h3>
      </div>
      {destino.vista ? (
        <RequisitosDeUnDestino requisitos={destino.vista.requisitos} />
      ) : (
        <Aviso tono="peligro">
          <p>{destino.errorDeLaVista}</p>
        </Aviso>
      )}
    </li>
  )
}
