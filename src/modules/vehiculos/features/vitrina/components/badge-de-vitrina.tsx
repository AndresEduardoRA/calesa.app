import { EyeOffIcon, GlobeIcon } from 'lucide-react'
import { cn } from 'cn'
import type { EstadoDeVitrina } from '../../../entities/vitrina'

type Props = {
  estado: EstadoDeVitrina
  // Por qué un publicado no se ve: se lee al pasar por encima y lo oye el lector de pantalla.
  motivo?: string
  className?: string
}

const BASE =
  'inline-flex h-5 max-w-full items-center gap-1 rounded-(--radius-pill) border px-2 text-(length:--text-xs) font-medium whitespace-nowrap'

// Si un vehículo se ve hoy en la web pública. «Publicado» no alcanza: su fase y su origen también
// tienen que publicar. Sin publicar no dice nada. Texto e ícono, nunca sólo color.
export function BadgeDeVitrina({ estado, motivo, className }: Props) {
  if (estado === 'sin_publicar') {
    return null
  }
  if (estado === 'en_vitrina') {
    return (
      <span
        className={cn(
          BASE,
          'border-transparent bg-(--color-positivo-soft) text-(--color-positivo-ink)',
          className,
        )}
      >
        <GlobeIcon aria-hidden className="size-3 shrink-0" />
        En vitrina
      </span>
    )
  }
  return (
    <span
      title={motivo}
      className={cn(
        BASE,
        'border-dashed border-(--color-line) bg-(--color-surface) text-(--color-ink-soft)',
        className,
      )}
    >
      <EyeOffIcon aria-hidden className="size-3 shrink-0" />
      Publicado, no visible
      {motivo ? <span className="sr-only">: {motivo}</span> : null}
    </span>
  )
}
