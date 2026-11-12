'use client'

import type { DestinoConVista } from '@/modules/flujos/client'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { Unidad } from '../../../entities/nucleo/unidad'
import type { BorradorDeMover } from '../hooks/use-borrador-de-mover'
import { FormularioDeMover } from './formulario-de-mover'
import { RequisitosDeUnDestino } from './requisitos-de-un-destino'

type Props = {
  unidad: Unidad
  destino: DestinoConVista
  puedeMover: boolean
  borrador: BorradorDeMover
  releer: () => void
}

// Un destino posible de la unidad: la fase a la que puede ir y lo que esa fase le pide, con lo que cumple y lo que falta. Si la vista previa de este destino no se pudo leer, lo dice aquí y no
// tumba a los demás.
export function DestinoDeMover({ unidad, destino, puedeMover, borrador, releer }: Props) {
  const abierto = borrador.abierto === destino.faseId
  return (
    <li
      className="grid gap-3 rounded-(--radius-md) border border-(--color-line) p-3"
      data-destino={destino.faseId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: destino.color }}
        />
        <h3 className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)">
          {destino.nombre}
        </h3>
        {puedeMover && destino.vista && !abierto ? (
          <Button
            variant="outline"
            className="ml-auto min-h-11 md:min-h-9"
            aria-label={`Elegir el destino «${destino.nombre}»`}
            onClick={() => {
              borrador.abrir(destino.faseId)
            }}
          >
            Elegir
          </Button>
        ) : null}
      </div>
      {destino.vista ? (
        <RequisitosDeUnDestino requisitos={destino.vista.requisitos} />
      ) : (
        <Aviso tono="peligro">
          <p>{destino.errorDeLaVista}</p>
        </Aviso>
      )}
      {abierto ? (
        <FormularioDeMover
          unidad={unidad}
          destino={destino}
          puedeMover={puedeMover}
          borrador={borrador}
          releer={releer}
        />
      ) : null}
    </li>
  )
}
