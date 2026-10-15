'use client'

import { Monto } from '@/shared/ui/monto'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { nombreDelVehiculoDeNota } from '../../../entities/vehiculo-de-nota'

// Lo que se sabe de una oportunidad, con su rótulo: el embudo (si hay más de uno), el monto, el vehículo
// y el motivo de una perdida. Lo que no tiene no se dibuja.
export function DatosDeOportunidad({
  oportunidad: o,
  nombrarEmbudo,
}: {
  oportunidad: OportunidadDelLead
  nombrarEmbudo: boolean
}) {
  const vehiculo = nombreDelVehiculoDeNota(o)
  return (
    <dl className="grid gap-1 text-(length:--text-sm) text-(--color-ink-soft) sm:grid-cols-[auto_1fr] sm:gap-x-4">
      {nombrarEmbudo ? (
        <>
          <dt>Embudo</dt>
          <dd className="text-(--color-ink)">{o.embudo.nombre}</dd>
        </>
      ) : null}
      {o.monto === null ? null : (
        <>
          <dt>Monto estimado</dt>
          <dd>
            <Monto valor={o.monto} moneda={o.moneda} className="text-(--color-ink)" />
          </dd>
        </>
      )}
      {vehiculo ? (
        <>
          <dt>Vehículo</dt>
          <dd className="text-(--color-ink)">{vehiculo}</dd>
        </>
      ) : null}
      {o.estado === 'perdida' && o.motivoPerdida ? (
        <>
          <dt>Motivo</dt>
          <dd className="text-(--color-ink)">{o.motivoPerdida}</dd>
        </>
      ) : null}
    </dl>
  )
}
