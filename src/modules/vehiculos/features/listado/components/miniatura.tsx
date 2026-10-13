import { CarFrontIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from 'cn'
import { urlPublica } from '@/shared/lib/almacen'

type Props = {
  // La miniatura de la portada del vehículo (ruta en el bucket `vehiculos`); sin fotos, el hueco.
  ruta?: string | null
  className?: string
}

// El lugar de la foto de un vehículo, siempre del mismo tamaño (4:3): con o sin foto, la lista no
// salta. Es decorativa (el título está al lado), por eso va oculta a los lectores de pantalla.
export function Miniatura({ ruta, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex aspect-4/3 w-14 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) text-(--color-ink-faint)',
        className,
      )}
    >
      {ruta ? (
        <Image
          src={urlPublica('vehiculos', ruta)}
          alt=""
          fill
          // Ya llega chica (480 px) desde Storage y con caché de un año: pasarla por el
          // optimizador sólo sumaría otra descarga. Lo que no está a la vista no se pide.
          unoptimized
          loading="lazy"
          sizes="96px"
          className="object-cover"
        />
      ) : (
        <CarFrontIcon className="size-5" />
      )}
    </span>
  )
}
