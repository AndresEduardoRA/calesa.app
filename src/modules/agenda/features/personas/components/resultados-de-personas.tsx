'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import type { PersonaElegida } from '../../../entities/edicion'
import { MINIMO_DE_BUSQUEDA_DE_PERSONAS } from '../../../entities/personas'
import type { EstadoDeBusqueda } from '../hooks/use-busqueda-de-personas'

const TACTIL = 'min-h-11 md:min-h-8'
const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'

type Props = {
  estado: EstadoDeBusqueda
  elegidas: readonly PersonaElegida[]
  alElegir: (persona: PersonaElegida) => void
  alReintentar: () => void
}

// Lo que sale de la búsqueda, con un texto por estado: escribe más, buscando, sin coincidencias, error con «Reintentar» o la lista (sin quien ya
// está elegido) y, al tope, el aviso de que hay más.
export function ResultadosDePersonas({ estado, elegidas, alElegir, alReintentar }: Props) {
  switch (estado.tipo) {
    case 'escribe':
      return (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Escribe al menos {MINIMO_DE_BUSQUEDA_DE_PERSONAS} letras.
        </p>
      )
    case 'cargando':
      return <p className={TEXTO}>Buscando…</p>
    case 'vacia':
      return <p className={TEXTO}>No encontramos a nadie con ese nombre.</p>
    case 'error':
      return (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {estado.mensaje}{' '}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TACTIL}
            onClick={alReintentar}
          >
            Reintentar
          </Button>
        </p>
      )
    case 'lista':
      return (
        <>
          <ul className="grid gap-1">
            {estado.encontradas.personas
              .filter((persona) => !elegidas.some((elegida) => elegida.id === persona.id))
              .map((persona) => (
                <li key={persona.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${TACTIL} w-full justify-start`}
                    onClick={() => {
                      alElegir(persona)
                    }}
                  >
                    {persona.nombre}
                  </Button>
                </li>
              ))}
          </ul>
          {estado.encontradas.hayMas ? (
            <AvisoDeTope texto="Hay más personas de las que se muestran. Escribe más letras." />
          ) : null}
        </>
      )
  }
}
