import { CarFrontIcon } from 'lucide-react'
import { cn } from 'cn'

type Props = {
  // La portada del vehículo. Todavía no hay fotos: el hueco queda reservado para que la lista no
  // salte el día que lleguen.
  url?: string | null
  className?: string
}

// El lugar de la foto de un vehículo, siempre del mismo tamaño (4:3).
export function Miniatura({ url, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex aspect-4/3 w-14 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) bg-cover bg-center text-(--color-ink-faint)',
        className,
      )}
      style={url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined}
    >
      {url ? null : <CarFrontIcon className="size-5" />}
    </span>
  )
}
