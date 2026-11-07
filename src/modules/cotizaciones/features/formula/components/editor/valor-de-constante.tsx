'use client'

import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { monedaDeFormato } from '../../../../entities/binding'
import type { Formato } from '../../../../entities/nodos'

// El valor de una constante en el editor (sus campos, lo que cambió el ⚙): el dinero por `<Monto>` (Modo Live), un porcentaje como porcentaje, lo demás con
// `formato.ts`.
export function ValorDeConstante({
  valor,
  formato,
  decimales,
}: {
  valor: number
  formato: Formato | undefined
  // Para lo que no es dinero (4.21-3a-2): 6 por omisión; el dinero lleva los de `<Monto>` salvo que se pida otro.
  decimales?: number
}) {
  const { locale } = useRegional()
  if (formato === 'usd' || formato === 'moneda') {
    return decimales === undefined ? (
      <Monto valor={valor} moneda={monedaDeFormato(formato)} />
    ) : (
      <Monto valor={valor} moneda={monedaDeFormato(formato)} decimales={decimales} />
    )
  }
  return (
    <span className="tabular-nums">
      {formato === 'pct'
        ? formatearPorcentaje(valor, { locale, decimales: decimales ?? 6 })
        : formatearNumero(valor, { locale, decimales: decimales ?? 6 })}
    </span>
  )
}
