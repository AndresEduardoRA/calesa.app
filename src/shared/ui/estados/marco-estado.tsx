import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'

type Props = {
  Icono: LucideIcon
  titulo: string
  descripcion?: string
  // Botón o enlace que saca a la persona del estado.
  accion?: ReactNode
  // En un bloque chico (una tarjeta de la bandeja) el marco se achica.
  compacto?: boolean
  className?: string
}

// La forma común de los cuatro estados sin datos. No se usa directo: cada estado tiene su
// componente, para que el mismo caso se vea y se diga igual en toda la app.
export function MarcoEstado({ Icono, titulo, descripcion, accion, compacto, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compacto ? 'gap-1.5 px-3 py-5' : 'gap-2 px-6 py-12',
        className,
      )}
    >
      <Icono
        aria-hidden
        className={cn('text-(--color-ink-faint)', compacto ? 'size-5' : 'size-8')}
      />
      <p
        className={cn(
          'font-medium text-(--color-ink)',
          compacto ? 'text-(length:--text-sm)' : 'text-(length:--text-lg)',
        )}
      >
        {titulo}
      </p>
      {descripcion ? (
        <p className="max-w-sm text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
      ) : null}
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  )
}
