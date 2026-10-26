'use client'

import { XCell } from '@/shared/ui/xcell'
import { propsDeCelda, type ContextoDeHoja } from '../../../entities/binding'
import type { CeldaDeHoja as Celda } from '../../../entities/hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'

type Props = { celda: Celda; contexto: ContextoDeHoja; acciones: AccionesDeHoja }

// Una celda de la hoja: las props de la `XCell` salen de la lectura, lo tipeado y la última respuesta (`entities/binding.ts`), y los callbacks son los mismos para todas.
// La ayuda y el ⚙ no se conectan todavía (sin callback la `XCell` no los dibuja).
export function CeldaDeHoja({ celda, contexto, acciones }: Props) {
  return (
    <XCell
      {...propsDeCelda(celda, contexto)}
      onCommit={acciones.alConfirmar}
      onReset={acciones.alRestablecer}
    />
  )
}
