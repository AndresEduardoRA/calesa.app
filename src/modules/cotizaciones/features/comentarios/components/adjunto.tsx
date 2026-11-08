'use client'

import { FileTextIcon, ImageIcon } from 'lucide-react'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  autorDelAdjunto,
  claseDelMime,
  tamanoLegible,
  type Adjunto,
} from '../../../entities/comentarios/adjunto'
import { descargarAdjunto } from '../hooks/use-adjuntos'

const BOTON = 'min-h-11 md:min-h-8'

type Props = {
  adjunto: Adjunto
  // Si quien mira lo puede quitar (`puedeQuitarAdjunto`); si no, «Quitar» no se dibuja.
  quitable: boolean
  pedirQuitar: (adjunto: Adjunto) => void
}

// Un adjunto de la lista (4.27-3): su icono, el nombre, el tamaño, quién y cuándo; «Descargar» pide la URL al tocarlo y «Quitar» abre su diálogo.
export function FilaDeAdjunto({ adjunto, quitable, pedirQuitar }: Props) {
  const { zonaHoraria, locale } = useRegional()
  const [bajando, setBajando] = useState(false)
  const [error, setError] = useState<ErrorApp | null>(null)
  const Icono = claseDelMime(adjunto.mime) === 'imagen' ? ImageIcon : FileTextIcon

  async function descargar() {
    setError(null)
    setBajando(true)
    setError(await descargarAdjunto(adjunto))
    setBajando(false)
  }

  return (
    <li className="grid min-w-0 gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <Icono aria-hidden className="size-5 shrink-0 text-(--color-ink-soft)" />
        <div className="grid min-w-0 flex-1">
          <span
            title={adjunto.nombre}
            className="truncate text-(length:--text-sm) font-medium text-(--color-ink)"
          >
            {adjunto.nombre}
          </span>
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            {tamanoLegible(adjunto.bytes, locale)} · {autorDelAdjunto(adjunto)} ·{' '}
            <time
              dateTime={adjunto.creadoEn}
              title={formatearFechaHora(adjunto.creadoEn, { zona: zonaHoraria })}
            >
              {fechaRelativa(adjunto.creadoEn, { zona: zonaHoraria })}
            </time>
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={BOTON}
            aria-label={`Descargar ${adjunto.nombre}`}
            disabled={bajando}
            onClick={() => void descargar()}
          >
            Descargar
          </Button>
          {quitable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={BOTON}
              aria-label={`Quitar ${adjunto.nombre}`}
              onClick={() => {
                pedirQuitar(adjunto)
              }}
            >
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error.mensaje}
        </p>
      ) : null}
    </li>
  )
}
