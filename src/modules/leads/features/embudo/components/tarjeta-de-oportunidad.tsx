'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { EtapaGuardada } from '../../../entities/embudo'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import type { Tarjeta } from '../../../entities/tablero'
import { rotuloDeVehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { InsigniaDeEstado } from '../../oportunidades/components/insignia-de-estado'
import { MenuMoverA } from '../../oportunidades/components/menu-mover-a'

type Props = {
  tarjeta: Tarjeta
  etapas: readonly EtapaGuardada[]
  enCurso: boolean
  alMover: (etapaId: string, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (etapa: EtapaGuardada) => void
}

// Una oportunidad en el kanban: título, de qué lead (lleva a su sección en la ficha), monto, vehículo,
// desde cuándo está en la etapa y «Mover a…». Ganada o perdida lo dice con texto.
export function TarjetaDeOportunidad({ tarjeta, etapas, enCurso, alMover, alPedirMotivo }: Props) {
  const { zonaHoraria } = useRegional()
  const href = `${RUTAS.leads}/${tarjeta.lead.id}?${CLAVE_DE_SECCION}=oportunidades` as Route
  return (
    <article
      aria-label={tarjeta.titulo}
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
          {tarjeta.titulo}
        </h3>
        {tarjeta.estado === 'abierta' ? null : <InsigniaDeEstado estado={tarjeta.estado} />}
      </div>
      <Link
        href={href}
        className="w-fit text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline"
      >
        {tarjeta.lead.nombre} <NumeroDeLead numeros={tarjeta.lead.numeros} />
      </Link>
      {tarjeta.monto === null && !tarjeta.vehiculo ? null : (
        <dl className="grid gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
          {tarjeta.monto === null ? null : (
            <div className="flex gap-1">
              <dt className="sr-only">Monto estimado</dt>
              <dd>
                <Monto
                  valor={tarjeta.monto}
                  moneda={tarjeta.moneda}
                  className="text-(--color-ink)"
                />
              </dd>
            </div>
          )}
          {tarjeta.vehiculo ? (
            <div className="flex gap-1">
              <dt className="sr-only">Vehículo</dt>
              <dd className="truncate">{rotuloDeVehiculoDeNota(tarjeta.vehiculo)}</dd>
            </div>
          ) : null}
        </dl>
      )}
      {tarjeta.estado === 'perdida' && tarjeta.motivoPerdida ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Motivo: {tarjeta.motivoPerdida}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-(length:--text-xs) text-(--color-ink-faint)">
          En esta etapa desde {fechaRelativa(tarjeta.enEtapaDesde, { zona: zonaHoraria })}
        </span>
        <MenuMoverA
          id={tarjeta.id}
          titulo={tarjeta.titulo}
          etapas={etapas}
          actual={tarjeta.etapaId}
          enCurso={enCurso}
          alMover={alMover}
          alPedirMotivo={alPedirMotivo}
        />
      </div>
    </article>
  )
}
