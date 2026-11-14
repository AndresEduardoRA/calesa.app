'use client'

import Image from 'next/image'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { useVisorDeGaleria } from '@/shared/ui/visor-de-imagenes'
import type { ImagenDeItem } from '../../../entities/items/imagenes'

type Props = {
  descripcion: string
  imagenes: readonly ImagenDeItem[]
  // Sin esto (sólo lectura) no hay «Quitar».
  alQuitar: ((imagen: ImagenDeItem) => void) | null
  // La que se está quitando: su botón queda deshabilitado.
  quitando: string | null
}

// La rejilla de imágenes de un ítem (8.09-3, C12): de 2 a 4 columnas, cada una abre el visor en esa, con su `alt` por posición y «Quitar» (objetivo de 44 px en el celular).
// Sin `next/image` optimizado (`unoptimized`, como las fotos del vehículo): se sirve el WebP de ≤ 1600 px, sólo de las ≤ 8 de un panel abierto (D65).
export function GaleriaDeImagenes({ descripcion, imagenes, alQuitar, quitando }: Props) {
  const galeria = useVisorDeGaleria(
    `imagenes-${imagenes[0]?.id ?? 'item'}`,
    descripcion,
    imagenes.map((imagen) => {
      const url = urlPublica('repuestos', imagen.ruta)
      return { id: imagen.id, miniatura: url, grande: url }
    }),
  )
  return (
    <>
      <ul
        aria-label={`Imágenes de «${descripcion}»`}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {imagenes.map((imagen, indice) => {
          const posicion = indice + 1
          return (
            <li
              key={imagen.id}
              className="grid min-w-0 content-start gap-1.5 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-1.5"
            >
              <button
                type="button"
                aria-label={`Ver la imagen ${String(posicion)} en tamaño completo`}
                className="relative block aspect-4/3 w-full cursor-zoom-in overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) outline-none focus-visible:shadow-(--shadow-focus)"
                onClick={() => {
                  galeria.abrir(indice)
                }}
              >
                <Image
                  src={urlPublica('repuestos', imagen.ruta)}
                  alt={`Imagen ${String(posicion)} de «${descripcion}»`}
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(min-width: 1024px) 160px, 45vw"
                  className="object-cover"
                />
              </button>
              {alQuitar ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 md:h-8"
                  aria-label={`Quitar la imagen ${String(posicion)} de «${descripcion}»`}
                  disabled={quitando === imagen.id}
                  onClick={() => {
                    alQuitar(imagen)
                  }}
                >
                  Quitar
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
      {galeria.visor}
    </>
  )
}
