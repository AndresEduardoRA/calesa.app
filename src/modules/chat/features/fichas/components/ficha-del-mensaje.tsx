'use client'

import { Button } from '@/shared/ui/button'
import type { ClaseDeFicha } from '../../../entities/fichas'
import type { ContextoDeFichas } from '../contexto-de-fichas'
import { FichaDeEvento } from './ficha-de-evento'
import { FichaDeTarea } from './ficha-de-tarea'

const NOMBRE = { tarea: 'Tarea', evento: 'Evento' } as const
const ELIMINADA = { tarea: 'Eliminada', evento: 'Eliminado' } as const
const NO_DISPONIBLE = { tarea: 'Tarea no disponible', evento: 'Evento no disponible' } as const

type Props = {
  clase: ClaseDeFicha
  // Nulo: la tarea o el evento se purgó (`on delete set null`).
  id: string | null
  usuarioId: string
  fichas: ContextoDeFichas
}

// La ficha de tarea o de evento de un mensaje, en cada uno de sus estados: leyendo, no se pudo leer, no se ve, eliminada o visible. Lo que no se ve no dice
// ni el título ni lleva enlace.
export function FichaDelMensaje({ clase, id, usuarioId, fichas }: Props) {
  if (id === null) {
    return (
      <p className="text-(--color-ink-soft)">
        {NOMBRE[clase]} · {ELIMINADA[clase]}
      </p>
    )
  }
  const estado = fichas.estadoDe(clase, id)
  if (estado === null) {
    return <p className="text-(--color-ink-soft)">Cargando…</p>
  }
  if (estado === 'error') {
    return (
      <div className="grid justify-items-start gap-1">
        <p className="text-(--color-ink-soft)">{NOMBRE[clase]} · No se pudo cargar</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={fichas.reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (estado.situacion === 'no_disponible') {
    return <p className="text-(--color-ink-soft)">{NO_DISPONIBLE[clase]}</p>
  }
  if (estado.situacion === 'eliminada') {
    return (
      <p className="text-(--color-ink-soft)">
        {NOMBRE[clase]} · {ELIMINADA[clase]}
      </p>
    )
  }
  return estado.datos.clase === 'tarea' ? (
    <FichaDeTarea id={estado.id} datos={estado.datos} usuarioId={usuarioId} fichas={fichas} />
  ) : (
    <FichaDeEvento id={estado.id} datos={estado.datos} />
  )
}
