'use client'

import { useId } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { PersonaElegida } from '../../../entities/edicion'
import type { PersonasEncontradas } from '../../../entities/personas'
import { useBusquedaDePersonas } from '../hooks/use-busqueda-de-personas'
import { PersonasElegidas } from './personas-elegidas'
import { ResultadosDePersonas } from './resultados-de-personas'

type Props = {
  etiqueta: string
  elegidas: readonly PersonaElegida[]
  // Con `multiple` se suman personas (hasta `maximo`); sin él, elegir una reemplaza a la anterior.
  multiple?: boolean
  maximo?: number
  alCambiar: (personas: PersonaElegida[]) => void
  leer: (texto: string) => Promise<Resultado<PersonasEncontradas>>
  error?: string
  // El campo recibe el foco al montarse (cuando aparece porque la persona cambió de opción).
  enfocar?: boolean
}

// Elegir personas buscándolas por nombre (desde 3 letras): los resultados son botones y las elegidas, una lista con «Quitar a …». Cada estado de
// la búsqueda dice su texto. La persona ya elegida no vuelve a salir entre los resultados.
export function SelectorDePersonas({
  etiqueta,
  elegidas,
  multiple = false,
  maximo,
  alCambiar,
  leer,
  error,
  enfocar = false,
}: Props) {
  const id = useId()
  const { texto, setTexto, estado, reintentar } = useBusquedaDePersonas(leer)
  const llena = multiple && maximo !== undefined && elegidas.length >= maximo

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-buscar`}>{etiqueta}</Label>
      <PersonasElegidas
        etiqueta={etiqueta}
        elegidas={elegidas}
        alQuitar={(persona) => {
          alCambiar(elegidas.filter((otra) => otra.id !== persona.id))
        }}
      />
      {llena ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Llegaste al máximo de {maximo} personas.
        </p>
      ) : (
        <>
          <Input
            id={`${id}-buscar`}
            type="search"
            autoComplete="off"
            autoFocus={enfocar}
            placeholder="Busca por nombre"
            value={texto}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-estado`}
            className="h-11 md:h-9"
            onChange={(evento) => {
              setTexto(evento.target.value)
            }}
          />
          {error ? (
            <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p>
          ) : null}
          <div id={`${id}-estado`} aria-live="polite" className="grid gap-1">
            <ResultadosDePersonas
              estado={estado}
              elegidas={elegidas}
              alElegir={(persona) => {
                alCambiar(multiple ? [...elegidas, persona] : [persona])
                setTexto('')
              }}
              alReintentar={reintentar}
            />
          </div>
        </>
      )}
    </div>
  )
}
