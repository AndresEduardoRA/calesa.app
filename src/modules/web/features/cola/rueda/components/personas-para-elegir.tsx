'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import {
  AVISO_MINIMO_PARA_BUSCAR,
  MINIMO_PARA_BUSCAR,
  MOTIVO_SIN_EQUIPO,
  type PersonaParaLaRueda,
} from '../../../../entities/cola/rueda'

type Props = {
  // El texto de la URL (`?q=`).
  busqueda: string
  buscando: boolean
  alBuscar: (texto: string) => void
  // Nula: no se leyó el equipo (el rol no lo ve).
  personas: readonly PersonaParaLaRueda[] | null
  hayMas: boolean
  errorDelEquipo: string | null
  alElegir: (persona: PersonaParaLaRueda) => void
}

// Buscar en el equipo y elegir a quién agregar. La búsqueda la resuelve la base desde 3 letras (con menos trae las primeras por nombre).
export function PersonasParaElegir({
  busqueda,
  buscando,
  alBuscar,
  personas,
  hayMas,
  errorDelEquipo,
  alElegir,
}: Props) {
  const router = useRouter()
  const [texto, setTexto] = useState(busqueda)
  const letras = texto.trim().length
  return (
    <div className="grid gap-3">
      <Campo
        nombre="buscar-en-el-equipo"
        etiqueta="Buscar en el equipo"
        type="search"
        autoComplete="off"
        value={texto}
        ayuda={letras > 0 && letras < MINIMO_PARA_BUSCAR ? AVISO_MINIMO_PARA_BUSCAR : undefined}
        onChange={(evento) => {
          setTexto(evento.target.value)
          alBuscar(evento.target.value)
        }}
      />
      {errorDelEquipo ? (
        <EstadoError
          compacto
          titulo="No pudimos leer el equipo"
          descripcion={errorDelEquipo}
          alReintentar={() => {
            router.refresh()
          }}
        />
      ) : personas === null ? (
        <EstadoVacio compacto titulo={MOTIVO_SIN_EQUIPO} />
      ) : personas.length === 0 ? (
        <EstadoVacio compacto titulo="Nadie del equipo con ese nombre." />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-busy={buscando || undefined}>
          {personas.map((persona) => (
            <FilaParaElegir key={persona.id} persona={persona} alElegir={alElegir} />
          ))}
        </ul>
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={`Mostrando las primeras ${formatearNumero(TOPE_DEL_EQUIPO)} por nombre. Escribe para buscar.`}
        />
      ) : null}
    </div>
  )
}

type PropsDeFila = { persona: PersonaParaLaRueda; alElegir: (persona: PersonaParaLaRueda) => void }

function FilaParaElegir({ persona, alElegir }: PropsDeFila) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-(--radius-md) border border-(--color-line) px-3 py-2">
      <div className="grid min-w-0 gap-0.5">
        <span className="font-medium break-words text-(--color-ink)">{persona.nombre}</span>
        <span className="text-(length:--text-sm) break-words text-(--color-ink-soft)">
          {persona.email}
        </span>
        {persona.motivo ? (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">{persona.motivo}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {persona.enLaRueda ? <Badge variant="secondary">Ya está en la rueda</Badge> : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-8"
          disabled={!persona.elegible}
          aria-label={`Elegir ${persona.nombre}`}
          onClick={() => {
            alElegir(persona)
          }}
        >
          Elegir
        </Button>
      </div>
    </li>
  )
}
