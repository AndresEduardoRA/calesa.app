import { Badge } from '@/shared/ui/badge'
import { textoDeSituacion } from '../../../entities/nucleo/situacion'
import type { TarjetaDeLaCadena } from '../../../entities/cadena/leer'

type Props = {
  tarjeta: Pick<TarjetaDeLaCadena, 'situacion' | 'demorada'>
  // «Desde hace 3 días en esta fase», ya armado contra el instante de la lectura.
  dias: string | null
}

// La línea de estado de una tarjeta: los días en la fase, «En subasta» o «Sin resolver» si la subasta manda y «Demorado» si la base lo calculó.
// Siempre con texto, nunca sólo color. Sin nada que decir, no se dibuja.
export function EstadoDeLaTarjeta({ tarjeta, dias }: Props) {
  const situacion = textoDeSituacion(tarjeta.situacion)
  if (!dias && !tarjeta.demorada && !situacion) {
    return null
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-xs) text-(--color-ink-soft)">
      {dias ? <span>{dias}</span> : null}
      {situacion ? (
        <Badge variant="outline" data-situacion={tarjeta.situacion}>
          {situacion}
        </Badge>
      ) : null}
      {tarjeta.demorada ? <Badge variant="destructive">Demorado</Badge> : null}
    </p>
  )
}
