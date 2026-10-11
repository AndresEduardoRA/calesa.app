import { cn } from 'cn'

type Props = {
  // El nombre y el color salen de la fila del rol: nada acá decide por el nombre.
  rol: { nombre: string; color: string | null }
  className?: string
}

// Cómo se nombra un rol en cualquier pantalla: su nombre con su color al lado. Texto y color,
// nunca sólo color. No tiene estado: sirve igual en un Server Component y en uno de cliente.
export function RoleBadge({ rol, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-1.5 rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)',
        className,
      )}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: rol.color ?? 'var(--color-ink-faint)' }}
      />
      <span className="truncate">{rol.nombre}</span>
    </span>
  )
}
