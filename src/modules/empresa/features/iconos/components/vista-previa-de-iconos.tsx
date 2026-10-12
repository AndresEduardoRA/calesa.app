'use client'

import Image from 'next/image'
import { useEffect, useMemo } from 'react'
import type { IconoDibujado } from '../../../composicion.client'

type Props = { dibujados: readonly IconoDibujado[] }

function Muestra({ url, etiqueta, redonda }: { url: string; etiqueta: string; redonda?: boolean }) {
  return (
    <figure className="grid justify-items-center gap-1.5">
      <Image
        src={url}
        alt={etiqueta}
        width={72}
        height={72}
        // Un archivo recién dibujado en el navegador: no hay nada que optimizar.
        unoptimized
        className={redonda ? 'size-18 rounded-(--radius-pill)' : 'size-18'}
      />
      <figcaption className="text-(length:--text-xs) text-(--color-ink-faint)">
        {etiqueta}
      </figcaption>
    </figure>
  )
}

// Cómo van a quedar, antes de guardarlos: el de la pestaña, el del celular y el que Android
// recorta con su propia forma (acá, en círculo).
export function VistaPreviaDeIconos({ dibujados }: Props) {
  const urls = useMemo(
    () => new Map(dibujados.map((icono) => [icono.clave, URL.createObjectURL(icono.contenido)])),
    [dibujados],
  )
  useEffect(() => {
    return () => {
      for (const url of urls.values()) {
        URL.revokeObjectURL(url)
      }
    }
  }, [urls])
  const [normal, iphone, recortado] = [urls.get('192'), urls.get('180'), urls.get('512m')]

  return (
    // Sobre un fondo apagado: un ícono de fondo blanco se tiene que distinguir de la tarjeta.
    <div
      role="group"
      aria-label="Vista previa de los íconos"
      className="flex flex-wrap gap-5 rounded-(--radius-md) bg-(--color-paper-dim) p-4"
    >
      {normal ? <Muestra url={normal} etiqueta="Navegador y Android" /> : null}
      {iphone ? <Muestra url={iphone} etiqueta="iPhone" /> : null}
      {recortado ? <Muestra url={recortado} etiqueta="Android, recortado" redonda /> : null}
    </div>
  )
}
