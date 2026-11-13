'use client'

import { cn } from 'cn'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { prepararLogo } from '../../../composicion.client'
import { TIPOS_DE_LOGO } from '../../../entities/marca'
import type { LogoElegido } from '../hooks/use-guardar-ajustes'

// El logo normal o el del tema oscuro: los dos campos conviven en la pantalla, así que cada uno
// tiene sus textos, su nombre accesible y sus ids.
const TEXTOS = {
  claro: {
    etiqueta: 'Logo',
    elegir: 'Elegir el logo de la empresa',
    subir: 'Subir logo',
    cambiar: 'Cambiar logo',
    quitar: 'Quitar el logo',
    alt: 'Logo de la empresa',
    id: 'logo',
  },
  oscuro: {
    etiqueta: 'Logo para el tema oscuro',
    elegir: 'Elegir el logo para el tema oscuro',
    subir: 'Subir logo oscuro',
    cambiar: 'Cambiar logo oscuro',
    quitar: 'Quitar el logo oscuro',
    alt: 'Logo de la empresa para el tema oscuro',
    id: 'logo-oscuro',
  },
} as const

type Variante = keyof typeof TEXTOS

type Props = {
  variante: Variante
  // El logo guardado, si hay.
  urlActual: string | null
  cambio: LogoElegido
  alCambiar: (cambio: LogoElegido) => void
  deshabilitado: boolean
}

function VistaPrevia({ url, variante }: { url: string | null; variante: Variante }) {
  return (
    // El del tema oscuro se ve sobre el fondo oscuro: `dark` resuelve ahí los tokens de ese tema.
    <span
      className={cn(
        variante === 'oscuro' && 'dark',
        'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) text-(length:--text-xs) text-(--color-ink-faint)',
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={TEXTOS[variante].alt}
          width={64}
          height={64}
          // Un archivo local o un objeto de Storage: no hay nada que optimizar.
          unoptimized
          className="size-full object-contain"
        />
      ) : (
        'Sin logo'
      )}
    </span>
  )
}

// El motivo del rechazo interrumpe al lector de pantalla; el aviso y la ayuda esperan su turno.
function Mensajes(props: { motivo: string | null; aviso: string | null; id: string }) {
  const { motivo, aviso, id } = props
  return (
    <>
      {motivo ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
      {aviso ? <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{aviso}</p> : null}
      <p id={`${id}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
        SVG, PNG, WebP o JPEG, hasta 1 MB. Se sube al guardar.
      </p>
    </>
  )
}

// Una dirección local para mostrar el archivo elegido, que se libera al cambiarlo o al salir.
function useUrlDeArchivo(archivo: Blob | null): string | null {
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [url])
  return url
}

// Elegir un logo sólo lo revisa y lo muestra: se sube recién al guardar (commit diferido). Si el
// formato o el tamaño no sirven, se dice acá y no cambia nada.
export function CampoLogo({ variante, urlActual, cambio, alCambiar, deshabilitado }: Props) {
  const textos = TEXTOS[variante]
  const selector = useRef<HTMLInputElement>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const elegido = cambio.tipo === 'nuevo' ? cambio.logo : null
  const vistaPrevia = useUrlDeArchivo(elegido?.contenido ?? null)

  const url = cambio.tipo === 'quitar' ? null : (vistaPrevia ?? urlActual)

  async function elegir(archivo: File) {
    const listo = await prepararLogo(archivo)
    if (!listo.ok) {
      setMotivo(listo.error.mensaje)
      return
    }
    setMotivo(null)
    alCambiar({ tipo: 'nuevo', logo: listo.data })
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
        {textos.etiqueta}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <VistaPrevia url={url} variante={variante} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={selector}
            type="file"
            accept={TIPOS_DE_LOGO}
            aria-label={textos.elegir}
            aria-invalid={motivo ? true : undefined}
            aria-describedby={motivo ? `${textos.id}-error` : `${textos.id}-ayuda`}
            className="sr-only"
            disabled={deshabilitado}
            onChange={(evento) => {
              const archivo = evento.target.files?.[0]
              if (archivo) {
                void elegir(archivo)
              }
              // Para que elegir dos veces el mismo archivo vuelva a avisar.
              evento.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            disabled={deshabilitado}
            onClick={() => selector.current?.click()}
          >
            {url ? textos.cambiar : textos.subir}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 md:h-8"
              aria-label={textos.quitar}
              disabled={deshabilitado}
              onClick={() => {
                setMotivo(null)
                alCambiar(urlActual ? { tipo: 'quitar' } : { tipo: 'igual' })
              }}
            >
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      <Mensajes motivo={motivo} aviso={elegido?.aviso ?? null} id={textos.id} />
    </div>
  )
}
