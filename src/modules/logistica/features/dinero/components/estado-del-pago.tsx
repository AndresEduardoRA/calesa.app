'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { FilaDePago } from '../../../entities/dinero/listas'

// «Confirmado» con su fecha, o «Sin confirmar»: texto y color, nunca sólo color. Quién lo confirmó está en el sello del panel de la unidad: la lista no trae el nombre (D4 de 6.11-3).
export function EstadoDelPago({ pago }: { pago: FilaDePago }) {
  const { zonaHoraria } = useRegional()
  if (!pago.confirmado) {
    return <Badge variant="outline">Sin confirmar</Badge>
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant="secondary">Confirmado</Badge>
      {pago.confirmadoEn ? (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">
          el {formatearFecha(pago.confirmadoEn, { zona: zonaHoraria })}
        </span>
      ) : null}
    </span>
  )
}
