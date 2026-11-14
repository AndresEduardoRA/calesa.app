import { cn } from 'cn'
import {
  etiquetaDeSituacion,
  type Situacion,
  type TonoDeSituacion,
} from '../../../entities/situacion'
import { BadgeDeFase } from './badge-de-fase'

type Props = {
  situacion: Situacion
  // null = todavía no entró al flujo de su origen.
  fase: { nombre: string; color: string } | null
  className?: string
}

const TONO: Record<Exclude<TonoDeSituacion, 'fase'>, string> = {
  info: 'border-(--color-info) bg-(--color-info-soft) text-(--color-info-ink)',
  aviso: 'border-(--color-aviso) bg-(--color-aviso-soft) text-(--color-aviso-ink)',
  apagado: 'border-(--color-line) bg-(--color-paper-dim) text-(--color-ink-soft)',
}

// La situación real de un vehículo: su fase (con su color) o, si la subasta manda, «En subasta», «Sin resolver» o «No ganada».
// Un `<span>` como `BadgeDeFase` y no `<Badge>`, que arrastra Base UI a la carga en frío. Texto y color, nunca sólo color.
export function BadgeDeSituacion({ situacion, fase, className }: Props) {
  const etiqueta = etiquetaDeSituacion(situacion, fase)
  if (etiqueta.tono === 'fase') {
    return <BadgeDeFase fase={fase} {...(className ? { className } : {})} />
  }
  return (
    <span
      data-situacion={situacion}
      className={cn(
        'inline-flex h-5 max-w-full items-center rounded-(--radius-pill) border px-2 text-(length:--text-xs) font-medium whitespace-nowrap',
        TONO[etiqueta.tono],
        className,
      )}
    >
      <span className="truncate">{etiqueta.texto}</span>
    </span>
  )
}
