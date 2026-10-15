'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { InsigniaDeEtiqueta } from '../../etiquetas/components/insignia-de-etiqueta'
import { AccionesDeOportunidad } from './acciones-de-oportunidad'
import { DatosDeOportunidad } from './datos-de-oportunidad'
import { InsigniaDeEstado } from './insignia-de-estado'

type Props = {
  oportunidad: OportunidadDelLead
  // Las etapas de su embudo (para «Mover a…») y si hay que nombrar el embudo (tiene más de uno).
  etapas: readonly EtapaGuardada[]
  nombrarEmbudo: boolean
  puedeEditar: boolean
  ocupada: boolean
  alMover: (etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alEditar: () => void
  alEliminar: () => void
}

// Una oportunidad del lead: título, etapa (con su color y su nombre) y estado, sus datos, las notas y
// desde cuándo está en la etapa.
export function ItemDeOportunidad({
  oportunidad: o,
  etapas,
  nombrarEmbudo,
  puedeEditar,
  ...acciones
}: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <article
      aria-label={o.titulo}
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-(length:--text-base) font-medium break-words text-(--color-ink)">
          {o.titulo}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <InsigniaDeEtiqueta etiqueta={{ nombre: o.etapa.nombre, color: o.etapa.color }} />
          <InsigniaDeEstado estado={o.estado} />
        </div>
      </div>
      <DatosDeOportunidad oportunidad={o} nombrarEmbudo={nombrarEmbudo} />
      {o.notas ? (
        <p className="text-(length:--text-sm) whitespace-pre-line text-(--color-ink)">{o.notas}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-(length:--text-xs) text-(--color-ink-faint)">
          En «{o.etapa.nombre}» desde {fechaRelativa(o.enEtapaDesde, { zona: zonaHoraria })}
        </span>
        {puedeEditar ? (
          <AccionesDeOportunidad
            titulo={o.titulo}
            etapas={etapas}
            actual={o.etapaId}
            {...acciones}
          />
        ) : null}
      </div>
    </article>
  )
}
