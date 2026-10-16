'use client'

import { Button } from '@/shared/ui/button'
import type { OpcionDePais } from '../../../entities/paises/resolver'

type Props = {
  opciones: readonly OpcionDePais[]
  // Lo que tiene «País» ahora.
  elegido: string
  etiquetaDelCampo: string
  alElegir: (nombre: string) => void
}

// El prefijo es de varios países y no se adivina: se le pregunta a quien tipea. Un botón por país,
// de 44 px en el celular; el elegido queda marcado.
export function OpcionesDePais({ opciones, elegido, etiquetaDelCampo, alElegir }: Props) {
  return (
    <div
      role="group"
      aria-label={`País del teléfono: completa «${etiquetaDelCampo}»`}
      className="flex flex-wrap items-center gap-2 text-(length:--text-sm)"
    >
      <span className="text-(--color-ink-soft)">¿De cuál es?</span>
      {opciones.map((opcion) => {
        const marcado = elegido === opcion.nombre
        return (
          <Button
            key={opcion.iso}
            type="button"
            size="sm"
            variant={marcado ? 'default' : 'outline'}
            aria-pressed={marcado}
            className="min-h-11 md:min-h-8"
            onClick={() => {
              alElegir(opcion.nombre)
            }}
          >
            Es de {opcion.nombre}
          </Button>
        )
      })}
    </div>
  )
}
