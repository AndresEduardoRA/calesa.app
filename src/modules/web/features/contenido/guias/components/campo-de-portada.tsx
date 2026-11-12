'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { subirImagenDelSitio } from '../../editor/subir-imagen.client'

type Props = {
  // La ruta en el bucket `web`, o `''` si no hay portada.
  ruta: string
  alCambiar: (ruta: string) => void
  deshabilitado: boolean
}

// La portada de la guía: sube una foto (WebP de hasta 1600 px) al bucket `web` y muestra su previa. «Quitar» la saca de la guía; el objeto se
// retira del bucket al guardar si ninguna otra guía lo usa.
export function CampoDePortada({ ruta, alCambiar, deshabilitado }: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subir(archivo: File) {
    setError(null)
    setSubiendo(true)
    const subida = await subirImagenDelSitio(archivo)
    setSubiendo(false)
    if (subida.ok) {
      alCambiar(subida.data.ruta)
    } else {
      setError(subida.error.mensaje)
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="portada">Portada</Label>
      {ruta === '' ? null : (
        // Ya llega comprimida (WebP de hasta 1600 px) y con caché de un año: pasarla por el optimizador sólo sumaría otra descarga.
        <Image
          src={urlPublica('web', ruta)}
          alt="Portada de la guía"
          width={320}
          height={192}
          unoptimized
          className="h-auto max-h-48 w-auto max-w-full rounded-(--radius-md) border border-(--color-line) object-contain"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          id="portada"
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={deshabilitado || subiendo}
          onClick={() => selector.current?.click()}
        >
          {subiendo ? 'Subiendo…' : ruta === '' ? 'Elegir portada' : 'Cambiar portada'}
        </Button>
        {ruta === '' ? null : (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-9"
            disabled={deshabilitado || subiendo}
            onClick={() => {
              alCambiar('')
            }}
          >
            Quitar portada
          </Button>
        )}
      </div>
      <input
        ref={selector}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir una imagen de portada"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          evento.target.value = ''
          if (archivo) {
            void subir(archivo)
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
