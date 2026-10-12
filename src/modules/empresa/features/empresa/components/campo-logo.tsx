'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { prepararLogo } from '../../../composicion.client'
import { TIPOS_DE_LOGO } from '../../../entities/marca'
import type { LogoElegido } from '../hooks/use-guardar-ajustes'

type Props = {
  // El logo guardado, si hay.
  urlActual: string | null
  cambio: LogoElegido
  alCambiar: (cambio: LogoElegido) => void
  deshabilitado: boolean
}

function VistaPrevia({ url }: { url: string | null }) {
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) text-(length:--text-xs) text-(--color-ink-faint)">
      {url ? (
        <Image
          src={url}
          alt="Logo de la empresa"
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
function Mensajes({ motivo, aviso }: { motivo: string | null; aviso: string | null }) {
  return (
    <>
      {motivo ? (
        <p
          id="logo-error"
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
      {aviso ? <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{aviso}</p> : null}
      <p id="logo-ayuda" className="text-(length:--text-sm) text-(--color-ink-faint)">
        SVG, PNG, WebP o JPEG, hasta 1 MB. Se sube al guardar.
      </p>
    </>
  )
}

// Elegir un logo sólo lo revisa y lo muestra: se sube recién al guardar (commit diferido). Si el
// formato o el tamaño no sirven, se dice acá y no cambia nada.
export function CampoLogo({ urlActual, cambio, alCambiar, deshabilitado }: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const elegido = cambio.tipo === 'nuevo' ? cambio.logo : null
  const vistaPrevia = useMemo(
    () => (elegido ? URL.createObjectURL(elegido.contenido) : null),
    [elegido],
  )
  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia)
      }
    }
  }, [vistaPrevia])

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
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Logo</span>
      <div className="flex flex-wrap items-center gap-4">
        <VistaPrevia url={url} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={selector}
            type="file"
            accept={TIPOS_DE_LOGO}
            aria-label="Elegir el logo de la empresa"
            aria-invalid={motivo ? true : undefined}
            aria-describedby={motivo ? 'logo-error' : 'logo-ayuda'}
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
            {url ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 md:h-8"
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
      <Mensajes motivo={motivo} aviso={elegido?.aviso ?? null} />
    </div>
  )
}
