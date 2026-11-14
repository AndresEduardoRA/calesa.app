'use client'

import type { ParaMover } from '@/modules/flujos/client'
import { estadoDelModoGanada, vistaDelHueco } from '../../../entities/mover/ganada'
import { HAY_MAS_DESTINOS, SIN_DESTINOS, SIN_FASE } from '../../../entities/mover/textos'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { conAbiertoPorDefecto, type BorradorDeMover } from '../hooks/use-borrador-de-mover'
import type { ModoGanada } from '../hooks/use-modo-ganada'
import { DestinoDeMover } from './destino-de-mover'
import { FueraDeRegla } from './fuera-de-regla'
import { LineaDeGanada } from './linea-de-ganada'

type Props = {
  unidad: UnidadAbierta
  dato: ParaMover
  actualizando: boolean
  releer: () => void
  borrador: BorradorDeMover
  // El modo «La ganamos» de la URL (sólo vale para un vehículo).
  modoGanada: ModoGanada
}

// El modo «La ganamos», la lista que toca y el borrador con que se mueve (en el modo, con el primer destino abierto y anotando la subasta ganada).
function armarLaLista({
  unidad,
  dato,
  borrador,
  modoGanada,
}: Omit<Props, 'actualizando' | 'releer'>) {
  const esVehiculo = unidad.tipo === 'vehiculo'
  const modo =
    modoGanada.activo && esVehiculo
      ? estadoDelModoGanada({
          situacion: unidad.situacion,
          faseActualId: dato.faseActualId,
          destinos: dato.destinos,
        })
      : null
  const vista = vistaDelHueco(modo, dato.destinos)
  const conDefecto = vista.abiertoPorDefecto
    ? conAbiertoPorDefecto(borrador, vista.abiertoPorDefecto)
    : borrador
  return {
    modo,
    vista,
    borrador: vista.anotaGanada ? conDefecto : { ...conDefecto, ganada: null },
    ofrecer: esVehiculo && unidad.situacion === 'sin_resolver' && dato.puedeMover,
  }
}

// Lo que dibuja «Qué falta» con la lectura lista: los destinos (o los de «La ganamos») y lo que cada uno pide.
export function CuerpoDeQueFalta(props: Props) {
  const { unidad, dato, actualizando, releer, modoGanada } = props
  const { modo, vista, borrador, ofrecer } = armarLaLista(props)
  return (
    <div className="grid gap-3" data-hueco="que-falta" data-estado="listo">
      <p aria-live="polite" className="min-h-4 text-(length:--text-sm) text-(--color-ink-faint)">
        {actualizando ? 'Actualizando…' : ''}
      </p>
      {dato.faseActualId === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_FASE}</p>
      ) : null}
      {dato.fueraDeRegla.length > 0 ? <FueraDeRegla faltan={dato.fueraDeRegla} /> : null}
      <LineaDeGanada modo={modo} ofrecer={ofrecer} alGanar={modoGanada.activar} />
      {vista.diceSinDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_DESTINOS}</p>
      ) : null}
      {vista.destinos.length > 0 ? (
        <ul className="grid gap-3">
          {vista.destinos.map((destino) => (
            <DestinoDeMover
              key={destino.faseId}
              unidad={unidad}
              destino={destino}
              puedeMover={dato.puedeMover}
              borrador={borrador}
              releer={releer}
            />
          ))}
        </ul>
      ) : null}
      {dato.hayMasDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{HAY_MAS_DESTINOS}</p>
      ) : null}
    </div>
  )
}
