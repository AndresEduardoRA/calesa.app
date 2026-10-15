import { cn } from 'cn'
import type { ColorDeEtiqueta, Etiqueta } from '../../../entities/etiqueta'

// Las clases de cada color de la paleta, escritas enteras para que Tailwind las vea. El fondo y el
// texto salen de `--etiqueta-<clave>-soft` e `-ink` (≥ 4.5:1 en claro y en oscuro); el punto, del
// tono base.
const FONDO: Record<ColorDeEtiqueta, string> = {
  gris: 'bg-(--etiqueta-gris-soft) text-(--etiqueta-gris-ink)',
  rojo: 'bg-(--etiqueta-rojo-soft) text-(--etiqueta-rojo-ink)',
  naranja: 'bg-(--etiqueta-naranja-soft) text-(--etiqueta-naranja-ink)',
  ambar: 'bg-(--etiqueta-ambar-soft) text-(--etiqueta-ambar-ink)',
  verde: 'bg-(--etiqueta-verde-soft) text-(--etiqueta-verde-ink)',
  turquesa: 'bg-(--etiqueta-turquesa-soft) text-(--etiqueta-turquesa-ink)',
  azul: 'bg-(--etiqueta-azul-soft) text-(--etiqueta-azul-ink)',
  violeta: 'bg-(--etiqueta-violeta-soft) text-(--etiqueta-violeta-ink)',
}

const PUNTO: Record<ColorDeEtiqueta, string> = {
  gris: 'bg-(--etiqueta-gris)',
  rojo: 'bg-(--etiqueta-rojo)',
  naranja: 'bg-(--etiqueta-naranja)',
  ambar: 'bg-(--etiqueta-ambar)',
  verde: 'bg-(--etiqueta-verde)',
  turquesa: 'bg-(--etiqueta-turquesa)',
  azul: 'bg-(--etiqueta-azul)',
  violeta: 'bg-(--etiqueta-violeta)',
}

// El punto de color solo: en el selector de color y junto a una opción. Decorativo: el nombre va al lado.
export function PuntoDeColor({ color, className }: { color: ColorDeEtiqueta; className?: string }) {
  return (
    <span aria-hidden className={cn('size-2 shrink-0 rounded-full', PUNTO[color], className)} />
  )
}

// Una etiqueta como se ve en todas partes: el nombre siempre, sobre su color (nunca sólo color).
export function InsigniaDeEtiqueta({
  etiqueta,
  className,
}: {
  etiqueta: Pick<Etiqueta, 'nombre' | 'color'>
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-40 items-center gap-1 rounded-(--radius-pill) px-2 text-(length:--text-xs) font-medium whitespace-nowrap',
        FONDO[etiqueta.color],
        className,
      )}
    >
      <PuntoDeColor color={etiqueta.color} />
      <span className="truncate">{etiqueta.nombre}</span>
    </span>
  )
}
