import { cn } from 'cn'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'
import { SUFIJO_DE_INACTIVO, type TipoDeLeadEnCatalogo } from '../../../entities/catalogos'

// El tipo de un lead con su nombre (el que configuró la empresa) y su icono, si lo tiene: nunca sólo color ni sólo icono. El borde de color lo da la CLASE del tipo —
// un cliente se distingue de un prospecto—, no su nombre ni su clave. Un tipo apagado que el lead conserva lo dice. Un nombre largo se corta con «…» dentro de su ancho (si no, en la ficha del celular se salía de su tarjeta; `title` lo trae completo) y «(inactivo)» nunca se corta. Sin el tipo
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
  const texto = tipo.activo ? tipo.nombre : `${tipo.nombre} ${SUFIJO_DE_INACTIVO}`
  return (
    <span
      title={texto}
      className={cn(
        'inline-flex h-5 max-w-full shrink-0 items-center rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)',
        tipo.clase === 'cliente' && 'border-(--color-primario) text-(--color-primario-ink)',
        className,
      )}
    >
      <IconoDelCatalogo clave={tipo.icono} className="mr-1 size-3" />
      <span className="min-w-0 truncate">{tipo.nombre}</span>
      {tipo.activo ? null : <span className="shrink-0">{`\u00a0${SUFIJO_DE_INACTIVO}`}</span>}
    </span>
  )
}
