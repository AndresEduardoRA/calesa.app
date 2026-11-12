'use client'

import { Badge } from '@/shared/ui/badge'
import { textoDeFaltan, vencimientoDe } from '../../../entities/aduana/estado'
import type { FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { useHoy } from '../hooks/use-hoy'

type Props = Pick<
  FilaDeDeclaracion,
  'venceTributosEl' | 'pagada' | 'faltan' | 'vehiculos' | 'hayOcultos'
>

// Cuándo vencen los tributos y si están pagados: siempre con texto («Vencida el …», «Pagada», «Faltan los tributos de 2»); el color sólo refuerza. Lo que dice «pagada» y «faltan» lo
// calculó la base (D1).
export function EstadoDeTributos(props: Props) {
  const hoy = useHoy()
  const vencimiento = vencimientoDe(props.venceTributosEl, hoy, props.pagada)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant={props.pagada ? 'secondary' : 'outline'}>{textoDeFaltan(props)}</Badge>
      {vencimiento.tipo === 'vencida' ? (
        <Badge variant="destructive">{vencimiento.texto}</Badge>
      ) : vencimiento.tipo === 'por-vencer' ? (
        <Badge variant="outline">{vencimiento.texto}</Badge>
      ) : (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">{vencimiento.texto}</span>
      )}
    </span>
  )
}
