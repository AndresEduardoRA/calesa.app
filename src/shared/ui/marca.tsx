import Image from 'next/image'
import { cn } from 'cn'

type Props = {
  // Nombre y logo de la empresa: los lee `app/` de los ajustes y los pasa. `shared` no los busca.
  nombre: string
  logoUrl?: string | null
  // El logo para el tema oscuro: con él, cada tema dibuja el suyo. Sin él, vale el normal.
  logoOscuroUrl?: string | null
  className?: string
}

// El glifo neutro de public/iconos/marca.svg, dibujado acá para que tome el color de la empresa:
// una imagen cargada con <img> no ve las variables del documento.
function GlifoNeutro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn('size-7 shrink-0', className)}>
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

function Logo({
  url,
  className,
  ...datos
}: {
  url: string
  className?: string
  'data-logo'?: string
}) {
  return (
    <Image
      src={url}
      alt=""
      width={28}
      height={28}
      unoptimized
      className={cn('size-7 shrink-0 rounded-(--radius-sm) object-contain', className)}
      {...datos}
    />
  )
}

// La identidad del despliegue. Sin logo cargado, el glifo neutro con el color de la marca. Con logo
// para el tema oscuro van los dos y el tema elige por CSS: la clase `.dark` llega antes de pintar,
// así el servidor y el cliente dibujan lo mismo y no parpadea al hidratar.
export function Marca({ nombre, logoUrl, logoOscuroUrl, className }: Props) {
  const claro = logoOscuroUrl ? 'dark:hidden' : undefined
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {logoUrl ? (
        <Logo url={logoUrl} className={claro} data-logo="claro" />
      ) : (
        <GlifoNeutro className={claro} />
      )}
      {logoOscuroUrl ? (
        <Logo url={logoOscuroUrl} className="hidden dark:block" data-logo="oscuro" />
      ) : null}
      <span className="truncate text-(length:--text-base) font-semibold text-(--color-ink)">
        {nombre}
      </span>
    </span>
  )
}
