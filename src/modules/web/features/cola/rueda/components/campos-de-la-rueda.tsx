'use client'

import { Campo } from '@/shared/ui/campo'
import { LIMITES_DE_LA_RUEDA } from '../../../../entities/cola/rueda'
import type { ErroresDeLaRueda } from '../hooks/use-agregar-a-la-rueda'

export type ValoresDeLaRueda = { maxAbiertas: string; prioridad: string; orden: string }

type Props = {
  valores: ValoresDeLaRueda
  errores: ErroresDeLaRueda
  alCambiar: (valores: ValoresDeLaRueda) => void
}

const { cupo, prioridad, orden } = LIMITES_DE_LA_RUEDA

// El cupo (vacío hereda el de la política), la prioridad y el orden de alguien en la rueda.
export function CamposDeLaRueda({ valores, errores, alCambiar }: Props) {
  return (
    <>
      <Campo
        nombre="maxAbiertas"
        etiqueta="Cupo de abiertas"
        type="number"
        inputMode="numeric"
        min={cupo.min}
        max={cupo.max}
        placeholder="Hereda la política"
        ayuda={`Vacío hereda el cupo de la política. De ${cupo.min} a ${cupo.max}.`}
        value={valores.maxAbiertas}
        error={errores.maxAbiertas}
        onChange={(evento) => {
          alCambiar({ ...valores, maxAbiertas: evento.target.value })
        }}
      />
      <Campo
        nombre="prioridad"
        etiqueta="Prioridad"
        type="number"
        inputMode="numeric"
        min={prioridad.min}
        max={prioridad.max}
        ayuda={`Más alta, recibe más turnos. De ${prioridad.min} a ${prioridad.max}.`}
        value={valores.prioridad}
        error={errores.prioridad}
        onChange={(evento) => {
          alCambiar({ ...valores, prioridad: evento.target.value })
        }}
      />
      <Campo
        nombre="orden"
        etiqueta="Orden"
        type="number"
        inputMode="numeric"
        min={orden.min}
        max={orden.max}
        ayuda={`Desempata: el menor va antes. De ${orden.min} a ${orden.max}.`}
        value={valores.orden}
        error={errores.orden}
        onChange={(evento) => {
          alCambiar({ ...valores, orden: evento.target.value })
        }}
      />
    </>
  )
}
