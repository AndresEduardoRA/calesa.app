'use client'

import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { Button } from '../button'
import type { Direccion } from './tipos'

type Props = {
  // El de la lista, para que dos pestañas no compartan ids: `${prefijo}-${id}-subir`.
  prefijo: string
  id: string
  nombre: string
  puedeSubir: boolean
  puedeBajar: boolean
  alMover: (direccion: Direccion) => void
}

// «Subir X» y «Bajar X»: ordenar sin arrastrar, con el teclado. Apagados en los extremos, con el motivo. Son botones propios de la fila:
// su clic no abre la fila. El `id` de cada botón es de donde el foco los encuentra después de mover (`useFocoTrasMover`).
export function BotonesDeOrden({ prefijo, id, nombre, puedeSubir, puedeBajar, alMover }: Props) {
  return (
    <span className="flex shrink-0">
      <Button
        id={`${prefijo}-${id}-subir`}
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
        id={`${prefijo}-${id}-bajar`}
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
    </span>
  )
}
