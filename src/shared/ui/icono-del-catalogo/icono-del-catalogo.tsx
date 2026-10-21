import { cn } from 'cn'
import { iconoADibujar } from '@/shared/lib/iconos'
import { TRAZOS } from './trazos'

// El icono de una clave del catálogo (`@/shared/lib/iconos`), de 1rem como el texto (crece con él al 200 %) y del color del texto
// (`currentColor`). Decorativo: el nombre al lado lo dice, así que va oculto al lector de pantalla. Sin icono no dibuja nada, y una
// clave que no se conoce (una fila escrita por fuera) cae en un círculo punteado y no rompe la pantalla.
const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function IconoDelCatalogo({
  clave,
  className,
}: {
  clave: string | null | undefined
  className?: string
}) {
  const que = iconoADibujar(clave)
  if (que.tipo === 'ninguno') {
    return null
  }
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      data-icono={que.tipo === 'clave' ? que.clave : 'desconocido'}
      className={cn('size-4 shrink-0', className)}
      {...TRAZO}
    >
      {que.tipo === 'clave' ? (
        TRAZOS[que.clave]
      ) : (
        <circle cx="12" cy="12" r="9" strokeDasharray="3 4" />
      )}
    </svg>
  )
}
