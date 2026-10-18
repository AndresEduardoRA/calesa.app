'use client'

import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Direccion } from '../../../entities/tipo-de-lead'

type Props = {
  id: string
  nombre: string
  puedeSubir: boolean
  puedeBajar: boolean
  alMover: (direccion: Direccion) => void
}

// «Subir X» y «Bajar X»: ordenar sin arrastrar, con el teclado. Apagados en los extremos, con el
// motivo. El `id` de cada botón es de donde el foco los encuentra después de mover.
export function BotonesDeOrden({ id, nombre, puedeSubir, puedeBajar, alMover }: Props) {
  return (
    <div className="order-1 flex shrink-0">
      <Button
        id={`tipo-${id}-subir`}
        variant="ghost"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Subir ${nombre}`}
        title={puedeSubir ? undefined : 'Ya es el primero de la lista.'}
        disabled={!puedeSubir}
        onClick={() => {
          alMover('subir')
        }}
      >
        <ArrowUpIcon aria-hidden />
      </Button>
      <Button
        id={`tipo-${id}-bajar`}
        variant="ghost"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Bajar ${nombre}`}
        title={puedeBajar ? undefined : 'Ya es el último de la lista.'}
        disabled={!puedeBajar}
        onClick={() => {
          alMover('bajar')
        }}
      >
        <ArrowDownIcon aria-hidden />
      </Button>
    </div>
  )
}
