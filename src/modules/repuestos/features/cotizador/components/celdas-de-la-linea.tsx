'use client'

import { XCell } from '@/shared/ui/xcell'
import { claveDeCelda, type CampoDeLinea } from '../../../entities/cotizador/errores'
import type { LineaEditable } from '../../../entities/cotizador/hoja-editable'

type Props = {
  linea: LineaEditable
  sugerida: string | null
  moneda: string
  errores: Readonly<Record<string, string>>
  bloqueada: string | undefined
  acciones: {
    alConfirmarNumero: (id: string, valor: number | null) => void
    alReiniciar: (id: string) => void
  }
}

function numero(texto: string | null): number | null {
  return texto === null ? null : Number(texto)
}

// Las tres `XCell` de una línea (8.12-4, C10): cantidad, costo y logística. La logística muestra la escrita o la sugerida del tramo; ↺ vuelve a la
// sugerida (D46). Sin tramo, la celda queda vacía (D43). El texto exacto lo arma el hook: acá el `number` es sólo para dibujar (D20).
export function CeldasDeLaLinea({ linea, sugerida, moneda, errores, bloqueada, acciones }: Props) {
  const error = (campo: CampoDeLinea) => errores[claveDeCelda(linea.id, campo)]
  return (
    <>
      <XCell
        id={`${linea.id}:cantidad`}
        label="Cantidad"
        format="numero"
        decimals={0}
        value={linea.cantidad}
        suggested={false}
        overridden={false}
        disabledReason={bloqueada}
        error={error('cantidad')}
        onCommit={acciones.alConfirmarNumero}
        onReset={acciones.alReiniciar}
      />
      <XCell
        id={`${linea.id}:costo`}
        label="Costo"
        format="monto"
        currency={moneda}
        value={numero(linea.costo)}
        suggested={false}
        overridden={false}
        disabledReason={bloqueada}
        error={error('costo')}
        onCommit={acciones.alConfirmarNumero}
        onReset={acciones.alReiniciar}
      />
      <XCell
        id={`${linea.id}:logistica`}
        label="Logística"
        format="monto"
        currency={moneda}
        value={numero(linea.logistica ?? sugerida)}
        suggested={linea.logistica === null && sugerida !== null}
        overridden={linea.logistica !== null && sugerida !== null}
        disabledReason={bloqueada}
        error={error('logistica')}
        onCommit={acciones.alConfirmarNumero}
        onReset={acciones.alReiniciar}
      />
    </>
  )
}
