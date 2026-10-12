import Image from 'next/image'
import { cn } from 'cn'

type Props = {
  // Nombre y logo de la empresa: los lee `app/` de los ajustes y los pasa. `shared` no los busca.
  nombre: string
  logoUrl?: string | null
  className?: string
}

// El glifo neutro de public/iconos/marca.svg, dibujado acá para que tome el color de la empresa:
// una imagen cargada con <img> no ve las variables del documento.
function GlifoNeutro() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="size-7 shrink-0">
      <rect width="100" height="100" rx="22" fill="var(--color-primario)" />
      <g fill="var(--color-sobre-primario)">
        <rect x="17" y="26.2" width="26.4" height="9.9" rx="4.95" />
        <rect x="17" y="45" width="40.9" height="9.9" rx="4.95" />
        <rect x="17" y="63.9" width="56.7" height="9.9" rx="4.95" />
        <polygon points="70.6,58.5 83,68.85 70.6,79.2" />
      </g>
    </svg>
  )
}

// La identidad del despliegue. Sin logo cargado, el glifo neutro con el color de la marca.
export function Marca({ nombre, logoUrl, className }: Props) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7 shrink-0 rounded-(--radius-sm) object-contain"
        />
      ) : (
        <GlifoNeutro />
      )}
      <span className="truncate text-(length:--text-base) font-semibold text-(--color-ink)">
        {nombre}
      </span>
    </span>
  )
}
