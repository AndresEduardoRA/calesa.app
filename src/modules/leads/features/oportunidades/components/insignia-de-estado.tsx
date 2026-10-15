import { cn } from 'cn'
import { ETIQUETA_DEL_ESTADO, type EstadoDeOportunidad } from '../../../entities/oportunidad'

const TONO: Record<EstadoDeOportunidad, string> = {
  abierta: 'bg-(--color-info-soft) text-(--color-info-ink)',
  ganada: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
  perdida: 'bg-(--color-peligro-soft) text-(--color-peligro-ink)',
  cancelada: 'bg-(--color-surface-3) text-(--color-ink-soft)',
}

// El estado de una oportunidad: siempre con su nombre (nunca sólo el color). Una abierta no se marca
// en el kanban (es lo de siempre); en la ficha, sí.
export function InsigniaDeEstado({
  estado,
  className,
}: {
  estado: EstadoDeOportunidad
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-(--radius-pill) px-2 text-(length:--text-xs) font-medium whitespace-nowrap',
        TONO[estado],
        className,
      )}
    >
      {ETIQUETA_DEL_ESTADO[estado]}
    </span>
  )
}
