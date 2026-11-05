'use client'

import { Monto } from '@/shared/ui/monto'
import { totalBsDelResumen } from '../../../entities/cabecera-de-la-hoja'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'

type Props = {
  respuesta: RespuestaDeRecalculo | null
  // El código de la moneda en que se escribe (`cabecera.monedaBs`, sale de la base).
  moneda: string
}

// La línea del resumen con el total en la moneda local, bajo el total: sólo con «Ver total Bs» encendido. Sin valor, «—» como el total. El Modo Live lo oculta como todo `<Monto>`.
export function TotalEnMonedaLocal({ respuesta, moneda }: Props) {
  const total = totalBsDelResumen(respuesta)
  return (
    <div
      data-total-bs=""
      className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)"
    >
      <span className="[overflow-wrap:anywhere]">Total en moneda local</span>
      <strong className="font-semibold text-(--color-ink) tabular-nums">
        {total.tipo === 'valor' ? <Monto valor={total.bs} moneda={moneda} /> : '—'}
      </strong>
    </div>
  )
}
