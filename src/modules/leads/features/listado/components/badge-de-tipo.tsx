import { cn } from 'cn'
import { ETIQUETA_DEL_TIPO, type TipoDelLead } from '../../../entities/listado'

// El tipo de un lead (prospecto o cliente) con su texto: nunca sólo color.
export function BadgeDeTipo({ tipo, className }: { tipo: TipoDelLead; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)',
        tipo === 'cliente' && 'border-(--color-primario) text-(--color-primario-ink)',
        className,
      )}
    >
      {ETIQUETA_DEL_TIPO[tipo]}
    </span>
  )
}
