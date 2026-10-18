import { cn } from 'cn'
import { SUFIJO_DE_INACTIVO, type TipoDeLeadEnCatalogo } from '../../../entities/catalogos'

// El tipo de un lead con su nombre (el que configuró la empresa): nunca sólo color. El borde de color lo da la CLASE del tipo —
// un cliente se distingue de un prospecto—, no su nombre ni su clave. Un tipo apagado que el lead conserva lo dice. Sin el tipo
// en el catálogo (no debería: la FK es `restrict`) no dibuja nada.
export function BadgeDeTipo({
  tipo,
  className,
}: {
  tipo: TipoDeLeadEnCatalogo | null
  className?: string
}) {
  if (tipo === null) {
    return null
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)',
        tipo.clase === 'cliente' && 'border-(--color-primario) text-(--color-primario-ink)',
        className,
      )}
    >
      {tipo.activo ? tipo.nombre : `${tipo.nombre} ${SUFIJO_DE_INACTIVO}`}
    </span>
  )
}
