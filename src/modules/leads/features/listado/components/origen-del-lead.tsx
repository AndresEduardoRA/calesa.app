import { cn } from 'cn'
import type { OrigenConEstado } from '../../../entities/ficha'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'

// El origen de un lead con su nombre (el que configuró la empresa) y, si lo tiene, su icono: nunca sólo el icono. Un nombre largo se corta con «…»
// dentro de su ancho (`title` lo trae completo). Sin icono es el nombre solo.
export function OrigenDelLead({
  nombre,
  icono,
  className,
}: {
  nombre: string
  icono: string | null
  className?: string
}) {
  return (
    <span
      title={nombre}
      className={cn('inline-flex max-w-full min-w-0 items-center gap-1.5', className)}
    >
      <IconoDelCatalogo clave={icono} className="size-3.5 text-(--color-ink-soft)" />
      <span className="min-w-0 truncate">{nombre}</span>
    </span>
  )
}

// La línea del origen en la tarjeta del celular: nada si el lead no tiene.
export function OrigenDeLaTarjeta({ origen }: { origen: OrigenConEstado | null }) {
  return origen ? (
    <OrigenDelLead
      nombre={origen.nombre}
      icono={origen.icono ?? null}
      className="text-(length:--text-xs) text-(--color-ink-soft)"
    />
  ) : null
}
