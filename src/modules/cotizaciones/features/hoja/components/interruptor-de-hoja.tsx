'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { textoDelCandado } from '../../../entities/binding'
import type { InterruptorDeHoja as Interruptorr } from '../../../entities/hoja'

type Props = {
  item: Interruptorr
  encendido: boolean
  // La variante elegida deja este interruptor sin efecto: se dice y no se pulsa.
  fueraDeVariante: boolean
  alCambiar: (nodo: string, encendido: boolean) => void
}

// Qué hace, sin nombrar las celdas que gobierna (alguna puede ser de un nivel que quien mira no ve).
const AYUDA_DEL_EFECTO = {
  habilita: 'Habilita las celdas que dependen de este dato.',
  muestra: 'Muestra en la tarjeta lo que depende de este dato.',
} as const

export function InterruptorDeHoja({ item, encendido, fueraDeVariante, alCambiar }: Props) {
  let ayuda: string = AYUDA_DEL_EFECTO[item.efecto]
  if (!item.editable) {
    ayuda = textoDelCandado(item.motivo)
  } else if (fueraDeVariante) {
    ayuda = 'No aplica a esta variante.'
  }
  return (
    <Interruptor
      titulo={item.etiqueta}
      ayuda={ayuda}
      valor={encendido}
      deshabilitado={!item.editable || fueraDeVariante}
      alCambiar={(valor) => {
        alCambiar(item.nodo, valor)
      }}
    />
  )
}
