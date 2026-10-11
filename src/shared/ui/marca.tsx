import Image from 'next/image'
import { cn } from 'cn'

type Props = {
  // Nombre y logo de la empresa: los lee `app/` de los ajustes y los pasa. `shared` no los busca.
  nombre: string
  logoUrl?: string | null
  className?: string
}

// La identidad del despliegue. Sin logo cargado, el glifo neutro de public/iconos.
export function Marca({ nombre, logoUrl, className }: Props) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Image
        src={logoUrl ?? '/iconos/marca.svg'}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="size-7 shrink-0 rounded-(--radius-sm) object-contain"
      />
      <span className="truncate text-(length:--text-base) font-semibold text-(--color-ink)">
        {nombre}
      </span>
    </span>
  )
}
