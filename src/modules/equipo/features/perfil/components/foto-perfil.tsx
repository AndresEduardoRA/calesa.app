'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import type { CambioDeFoto } from '../hooks/use-guardar-perfil'

type Props = {
  nombre: string
  // La foto guardada, si hay.
  urlActual: string | null
  cambio: CambioDeFoto
  alCambiar: (cambio: CambioDeFoto) => void
  deshabilitado: boolean
}

// Elegir una foto sólo la muestra: se sube recién al guardar el formulario (commit diferido).
export function FotoPerfil({ nombre, urlActual, cambio, alCambiar, deshabilitado }: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const archivo = cambio.tipo === 'nueva' ? cambio.archivo : null
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia)
      }
    }
  }, [vistaPrevia])

  const url = cambio.tipo === 'quitar' ? null : (vistaPrevia ?? urlActual)

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar nombre={nombre} url={url} lado={72} />
      <div className="flex flex-wrap gap-2">
        <input
          ref={selector}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Elegir una foto de perfil"
          className="sr-only"
          onChange={(evento) => {
            const elegido = evento.target.files?.[0]
            if (elegido) {
              alCambiar({ tipo: 'nueva', archivo: elegido })
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
          {url ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 md:h-8"
            disabled={deshabilitado}
            onClick={() => {
              alCambiar(urlActual ? { tipo: 'quitar' } : { tipo: 'igual' })
            }}
          >
            Quitar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
