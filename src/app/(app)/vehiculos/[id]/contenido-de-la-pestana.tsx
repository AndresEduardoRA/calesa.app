import { Suspense } from 'react'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import { EsqueletoDeFotos, type Vehiculo } from '@/modules/vehiculos'
import { BloqueSubasta } from './bloque-subasta'
import { BloqueVinculo } from './bloque-vinculo'
import type { PestanaDeVehiculo } from './pestanas'
import { SeccionFicha } from './seccion-ficha'
import { SeccionFotos } from './seccion-fotos'

type Props = {
  pestana: PestanaDeVehiculo
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  // Si quien mira puede editar el vehículo.
  editable: boolean
  // Si quien mira ve leads (para el vínculo y los interesados).
  verLeads: boolean
}

// Lo que va debajo de la cabecera según la pestaña de `?seccion=`.
export function ContenidoDeLaPestana({
  pestana,
  vehiculo,
  origen,
  layout,
  editable,
  verLeads,
}: Props) {
  if (pestana === 'fotos') {
    return (
      // La cabecera y las pestañas ya están: las fotos llegan en su propio hueco.
      <Suspense fallback={<EsqueletoDeFotos />}>
        <SeccionFotos
          vehiculoId={vehiculo.id}
          origenId={origen.id}
          deSubasta={origen.tipo === 'subasta'}
          puedeEditar={editable}
        />
      </Suspense>
    )
  }
  return (
    <>
      {origen.tipo === 'subasta' ? (
        <Suspense fallback={null}>
          <BloqueSubasta vehiculo={vehiculo} editable={editable} />
        </Suspense>
      ) : null}
      <SeccionFicha vehiculo={vehiculo} origen={origen} layout={layout} />
      {/* A quién pertenece y a quién le interesa: sólo para quien ve leads. */}
      {verLeads ? (
        <Suspense fallback={null}>
          <BloqueVinculo vehiculoId={vehiculo.id} />
        </Suspense>
      ) : null}
    </>
  )
}
