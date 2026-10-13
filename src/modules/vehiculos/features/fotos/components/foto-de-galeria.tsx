import Image from 'next/image'
import type { KeyboardEvent } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import { Badge } from '@/shared/ui/badge'
import type { Direccion, Foto } from '../../../entities/foto'
import { BotonesDeFoto, type AccionesDeFoto } from './botones-de-foto'

type Props = {
  foto: Foto
  total: number
  // Sin esto la foto se ve y nada más.
  acciones: AccionesDeFoto | null
  ocupado: boolean
  // Después de moverla, el foco vuelve al botón con que se la movió.
  enfocar: Direccion | null
}

// Una foto guardada: su miniatura (la completa se abre aparte) y lo que se puede hacer con ella.
// Las fotos no tienen nombre: se dicen por su lugar.
export function FotoDeGaleria({ foto, total, acciones, ocupado, enfocar }: Props) {
  const esPrimera = foto.orden <= 1
  const esUltima = foto.orden >= total

  // Con el foco en cualquier botón de la foto, Alt + ← y Alt + → la mueven.
  function alTeclear(evento: KeyboardEvent<HTMLLIElement>) {
    if (!acciones || ocupado || !evento.altKey) {
      return
    }
    if (evento.key === 'ArrowLeft' && !esPrimera) {
      evento.preventDefault()
      acciones.alMover('antes')
    }
    if (evento.key === 'ArrowRight' && !esUltima) {
      evento.preventDefault()
      acciones.alMover('despues')
    }
  }

  return (
    <li
      className="grid min-w-0 content-start gap-1.5 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-1.5"
      onKeyDown={alTeclear}
    >
      <a
        href={urlPublica('vehiculos', foto.ruta)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Ver la foto ${foto.orden} en tamaño completo`}
        className="relative block aspect-4/3 overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) outline-none focus-visible:shadow-(--shadow-focus)"
      >
        <Image
          src={urlPublica('vehiculos', foto.rutaMiniatura)}
          alt={`Foto ${foto.orden} de ${total}`}
          fill
          unoptimized
          loading="lazy"
          sizes="(min-width: 1024px) 220px, 45vw"
          className="object-cover"
        />
        {foto.esPortada ? (
          <Badge className="absolute top-1.5 left-1.5" variant="secondary">
            Portada
          </Badge>
        ) : null}
      </a>
      {acciones ? (
        <BotonesDeFoto
          foto={foto}
          esPrimera={esPrimera}
          esUltima={esUltima}
          acciones={acciones}
          ocupado={ocupado}
          enfocar={enfocar}
        />
      ) : null}
    </li>
  )
}
