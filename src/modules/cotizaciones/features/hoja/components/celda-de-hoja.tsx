'use client'

import { XCell } from '@/shared/ui/xcell'
import { propsDeCelda, type ContextoDeHoja } from '../../../entities/binding'
import type { CeldaDeHoja as Celda } from '../../../entities/hoja'
import { ayudaDeTexto } from '../../../entities/presentacion-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'

type Props = { celda: Celda; contexto: ContextoDeHoja; acciones: AccionesDeHoja }

// Una celda de la hoja: las props de la `XCell` salen de la lectura, lo tipeado y la última respuesta (`entities/binding.ts`), y los callbacks son los mismos para todas.
// La ayuda de texto se conecta (4.13-4a); la de una tabla y el ⚙ todavía no (sin callback la `XCell` no los dibuja).
export function CeldaDeHoja({ celda, contexto, acciones }: Props) {
  return (
    <XCell
      {...propsDeCelda(celda, contexto)}
      hasHelp={ayudaDeTexto(celda) !== null}
      onHelp={acciones.alAyudar}
      onCommit={acciones.alConfirmar}
      onReset={acciones.alRestablecer}
    />
  )
}
