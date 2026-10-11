import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'

export type TonoAviso = 'info' | 'positivo' | 'aviso' | 'peligro'

const POR_TONO = {
  info: { clases: 'bg-(--color-info-soft) text-(--color-info-ink)', Icono: InfoIcon },
  positivo: {
    clases: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
    Icono: CircleCheckIcon,
  },
  aviso: { clases: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)', Icono: TriangleAlertIcon },
  peligro: {
    clases: 'bg-(--color-peligro-soft) text-(--color-peligro-ink)',
    Icono: CircleAlertIcon,
  },
} as const

type Props = { tono?: TonoAviso; className?: string; children: ReactNode }

// Mensaje fijo dentro de la pantalla (el resultado de un envío, un estado de la cuenta). Lo que
// es un error interrumpe al lector de pantalla; el resto espera su turno.
export function Aviso({ tono = 'info', className, children }: Props) {
  const { clases, Icono } = POR_TONO[tono]
  return (
    <div
      role={tono === 'peligro' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-(--radius-md) px-3 py-2.5 text-(length:--text-sm)',
        clases,
        className,
      )}
    >
      <Icono aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
