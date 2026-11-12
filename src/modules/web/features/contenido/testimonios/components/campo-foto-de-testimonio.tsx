'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'

type Props = {
  // La ruta de la foto que ya tiene el testimonio (en el bucket `web`).
  rutaActual: string | null
  archivo: File | null
  quitada: boolean
  error: string | undefined
  alElegir: (archivo: File) => void
  alQuitar: () => void
}

// La foto de un testimonio: elegir sólo la muestra; se achica a WebP y se sube al guardar (`use-formulario-de-testimonio`). «Quitar foto» la vacía.
export function CampoFotoDeTestimonio({
  rutaActual,
  archivo,
  quitada,
  error,
  alElegir,
  alQuitar,
}: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
    }
  }, [vistaPrevia])
  const url = quitada ? null : (vistaPrevia ?? (rutaActual ? urlPublica('web', rutaActual) : null))
  return (
    <div className="grid gap-1.5">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Foto (opcional)
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) text-(length:--text-xs) text-(--color-ink-faint)">
          {url ? (
            <Image
              src={url}
              alt="Vista previa de la foto"
              width={64}
              height={64}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            'Sin foto'
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <input
            ref={selector}
            type="file"
            name="foto"
            accept="image/*"
            aria-label="Elegir la foto del testimonio"
            aria-invalid={error ? true : undefined}
            aria-describedby="foto-de-testimonio-ayuda"
            className="sr-only"
            onChange={(evento) => {
              const elegido = evento.target.files?.[0]
              if (elegido) alElegir(elegido)
              // Para que elegir dos veces el mismo archivo vuelva a avisar.
              evento.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            onClick={() => selector.current?.click()}
          >
            {url ? 'Cambiar foto' : 'Elegir foto'}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" className="h-11 md:h-8" onClick={alQuitar}>
              Quitar foto
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      <p id="foto-de-testimonio-ayuda" className="text-(length:--text-sm) text-(--color-ink-faint)">
        JPG, PNG o WebP. Se achica a WebP y se sube al guardar.
      </p>
    </div>
  )
}
