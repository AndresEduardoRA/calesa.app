'use client'

import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { monedaDeFormato } from '../../../entities/binding'
import type { Formato } from '../../../entities/nodos'

// El valor de un nodo que la hoja dibuja sin editarlo (un subtotal, lo que suma la tarjeta): el dinero por `<Monto>` (Modo Live), lo demás con `formato.ts`.
// Sin valor, un guion que el lector de pantalla dice.
export function ValorDeNodo({ valor, formato }: { valor: number | null; formato: Formato }) {
  const { locale } = useRegional()
  if (valor === null) {
    return <span aria-label="Sin valor">—</span>
  }
  if (formato === 'usd' || formato === 'moneda') {
    return <Monto valor={valor} moneda={monedaDeFormato(formato)} />
  }
  return (
    <span className="tabular-nums">
      {formato === 'pct'
        ? formatearPorcentaje(valor, { locale })
        : formatearNumero(valor, { locale })}
    </span>
  )
}
