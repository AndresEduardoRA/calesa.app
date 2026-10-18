'use client'

import Image from 'next/image'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { leerFotosDelResumen } from '../../../composicion.client'
import { useLecturaDeLaPestana } from '../hooks/use-lectura-de-la-pestana'

function Esqueleto() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando las fotos"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, indice) => (
        <Skeleton key={indice} className="aspect-4/3 rounded-(--radius-card)" />
      ))}
    </div>
  )
}

// «Fotos» del resumen: las del vehículo en su orden, de sólo lectura (subirlas, ordenarlas y quitarlas es de la ficha). Se lee al
// elegir la pestaña (a lo sumo 24) y llega con su código por `diferido()`; cada miniatura abre la completa en otra pestaña.
export function FotosDelResumen({ vehiculoId }: { vehiculoId: string }) {
  const { lectura, reintentar } = useLecturaDeLaPestana(
    () => leerFotosDelResumen(vehiculoId),
    vehiculoId,
  )
  if (lectura.estado === 'leyendo') {
    return <Esqueleto />
  }
  if (lectura.estado === 'fallo') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar las fotos.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  const fotos = lectura.dato
  if (fotos.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Este vehículo no tiene fotos todavía.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
      {fotos.map((foto) => (
        <li key={foto.id} className="min-w-0">
          <a
            href={urlPublica('vehiculos', foto.ruta)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir la foto ${String(foto.orden)} de ${String(fotos.length)} en otra pestaña${foto.esPortada ? ' (portada)' : ''}`}
            className="relative block aspect-4/3 overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim) outline-none focus-visible:shadow-(--shadow-focus)"
          >
            <Image
              src={urlPublica('vehiculos', foto.rutaMiniatura)}
              alt=""
              fill
              // Ya llega chica (480 px) desde Storage y con caché de un año: pasarla por el optimizador sólo sumaría otra descarga.
              unoptimized
              loading="lazy"
              sizes="160px"
              className="object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  )
}
