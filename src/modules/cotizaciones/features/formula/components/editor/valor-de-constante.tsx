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
}: {
  valor: number
  formato: Formato | undefined
}) {
  const { locale } = useRegional()
  if (formato === 'usd' || formato === 'moneda') {
    return <Monto valor={valor} moneda={monedaDeFormato(formato)} />
  }
  return (
    <span className="tabular-nums">
      {formato === 'pct'
        ? formatearPorcentaje(valor, { locale, decimales: 6 })
        : formatearNumero(valor, { locale, decimales: 6 })}
    </span>
  )
}
