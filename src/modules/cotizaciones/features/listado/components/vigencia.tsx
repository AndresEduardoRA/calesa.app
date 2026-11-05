'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'

type Props = { venceEl: string; vencida: boolean }

// Hasta cuándo vale una cotización: «Vencida» o «Vale hasta el …» (la fecha es la de la zona de la empresa, la misma que dibuja la cabecera de una guardada).
export function Vigencia({ venceEl, vencida }: Props) {
  const { zonaHoraria } = useRegional()
  return vencida ? (
    <Badge variant="destructive">Vencida</Badge>
  ) : (
    <span className="text-(length:--text-sm) text-(--color-ink-soft)">
      Vale hasta el {formatearFecha(venceEl, { zona: zonaHoraria })}
    </span>
  )
}
