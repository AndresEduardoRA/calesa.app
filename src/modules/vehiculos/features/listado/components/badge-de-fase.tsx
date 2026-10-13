import { cn } from 'cn'

type Props = {
  // null = todavía no entró al flujo de su origen.
  fase: { nombre: string; color: string } | null
  className?: string
}

// La fase de un vehículo: su nombre con su color al lado, los dos de la fila. Texto y color,
// nunca sólo color.
export function BadgeDeFase({ fase, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-1.5 rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)',
        fase === null && 'border-dashed text-(--color-ink-soft)',
        className,
      )}
    >
      {fase ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: fase.color }}
        />
      ) : null}
      <span className="truncate">{fase?.nombre ?? 'Sin fase'}</span>
    </span>
  )
}
