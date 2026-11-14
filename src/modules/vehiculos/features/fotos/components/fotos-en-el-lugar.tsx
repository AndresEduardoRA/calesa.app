'use client'

import { CarFrontIcon } from 'lucide-react'
import { useCallback } from 'react'
import { cn } from 'cn'
import { urlPublica } from '@/shared/lib/almacen'
import { CarruselEnElLugar, type ImagenDelVisor } from '@/shared/ui/visor-de-imagenes'
import { leerFotosDelResumen } from '../../../composicion.client'

type Props = {
  // La fila: su id, su título y la miniatura de la portada (ruta en el bucket `vehiculos`).
  vehiculo: { id: string; titulo: string; portadaRuta: string | null }
  // `abrir` en la fila de la tabla (no caben flechas de 44 px en 56 px); `carrusel` en la tarjeta y las cabeceras.
  modo?: 'carrusel' | 'abrir'
  className?: string
}

// Las fotos de un vehículo donde se nombra (fila, tarjeta, resumen, ficha, hoja de cotizar): la portada y, al acercarse, el resto por
// `leerFotosDelResumen` (a lo sumo 24, una sola lectura). Siempre del mismo tamaño (4:3): con o sin foto, la lista no salta.
export function FotosEnElLugar({ vehiculo, modo = 'carrusel', className }: Props) {
  const { id: vehiculoId, titulo, portadaRuta: portada } = vehiculo
  const cargar = useCallback(async (): Promise<readonly ImagenDelVisor[] | null> => {
    const leidas = await leerFotosDelResumen(vehiculoId)
    if (!leidas.ok) return null
    return leidas.data.map((foto) => ({
      id: foto.id,
      miniatura: urlPublica('vehiculos', foto.rutaMiniatura),
      grande: urlPublica('vehiculos', foto.ruta),
    }))
  }, [vehiculoId])
  return (
    <CarruselEnElLugar
      clave={vehiculoId}
      titulo={titulo}
      portada={portada ? urlPublica('vehiculos', portada) : null}
      cargar={cargar}
      modo={modo}
      vacio={<CarFrontIcon className="size-5 text-(--color-ink-faint)" />}
      className={cn('aspect-4/3 rounded-(--radius-sm) bg-(--color-paper-dim)', className)}
    />
  )
}
