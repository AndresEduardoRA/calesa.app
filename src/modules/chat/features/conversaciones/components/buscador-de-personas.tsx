'use client'

import { useId } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  MINIMO_DE_BUSQUEDA_DE_PERSONAS,
  type PersonaEncontrada,
  type PersonasEncontradas,
} from '../../../entities/personas'
import type { Resultado } from '@/shared/lib/errores'
import { useBuscadorDePersonas, type EstadoDeBusqueda } from '../hooks/use-buscador-de-personas'

const TACTIL = 'min-h-11 md:min-h-8'
const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'

type Props = {
  etiqueta: string
  leer: (texto: string) => Promise<Resultado<PersonasEncontradas>>
  // Los ya elegidos no vuelven a salir.
  excluir?: readonly string[]
  // Mientras actúa, los botones de los resultados no responden (un clic = un pedido).
  ocupado?: boolean
  alElegir: (persona: PersonaEncontrada) => void
  enfocar?: boolean
}

function Resultados({
  estado,
  excluir,
  ocupado,
  alElegir,
  alReintentar,
}: {
  estado: EstadoDeBusqueda
  excluir: readonly string[]
  ocupado: boolean
  alElegir: (persona: PersonaEncontrada) => void
  alReintentar: () => void
}) {
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
              .filter((persona) => !excluir.includes(persona.id))
              .map((persona) => (
                <li key={persona.id}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ocupado}
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

// Buscar a una persona por nombre (desde 3 letras) y elegirla. Cada estado de la búsqueda dice su texto. Dentro de un `<form>`, Enter en el campo no
// envía el formulario.
export function BuscadorDePersonas({
  etiqueta,
  leer,
  excluir = [],
  ocupado = false,
  alElegir,
  enfocar = false,
}: Props) {
  const id = useId()
  const { texto, setTexto, estado, reintentar } = useBuscadorDePersonas(leer)
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-buscar`}>{etiqueta}</Label>
      <Input
        id={`${id}-buscar`}
        type="search"
        autoComplete="off"
        autoFocus={enfocar}
        placeholder="Busca por nombre"
        value={texto}
        aria-describedby={`${id}-estado`}
        className="h-11 md:h-9"
        onChange={(evento) => {
          setTexto(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
          }
        }}
      />
      <div id={`${id}-estado`} aria-live="polite" className="grid gap-1">
        <Resultados
          estado={estado}
          excluir={excluir}
          ocupado={ocupado}
          alElegir={(persona) => {
            alElegir(persona)
            setTexto('')
          }}
          alReintentar={reintentar}
        />
      </div>
    </div>
  )
}
