import Image from 'next/image'
import { cn } from 'cn'

// Hasta dos iniciales: «Ana María Quispe» → «AQ»; sin nombre, un signo neutro.
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  const primera = palabras[0]
  if (!primera) {
    return '·'
  }
  const ultima = palabras.length > 1 ? palabras.at(-1) : undefined
  return `${primera.charAt(0)}${ultima?.charAt(0) ?? ''}`.toLocaleUpperCase('es')
}

type Props = {
  nombre: string
  // URL pública de la foto (bucket `avatares`), ya armada por quien lee el perfil.
  url?: string | null
  // Lado en píxeles.
  lado?: number
  className?: string
}

// La foto de una persona o, sin foto, sus iniciales. El nombre va en el texto alternativo.
export function Avatar({ nombre, url, lado = 32, className }: Props) {
  const estilo = { width: lado, height: lado }
  if (url) {
    return (
      <Image
        src={url}
        alt={nombre}
        width={lado}
        height={lado}
        // Ya llega chica y en WebP desde Storage: optimizarla de nuevo no gana nada.
        unoptimized
        style={estilo}
        className={cn('shrink-0 rounded-(--radius-pill) object-cover', className)}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label={nombre || 'Sin nombre'}
      style={{ ...estilo, fontSize: Math.round(lado * 0.4) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--color-primario-soft) font-medium text-(--color-primario-ink) select-none',
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  )
}
