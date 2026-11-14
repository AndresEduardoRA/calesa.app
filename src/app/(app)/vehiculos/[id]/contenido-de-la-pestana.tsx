import { Suspense } from 'react'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import { type AvisosDelMenu, type Vehiculo } from '@/modules/vehiculos'
import { EsqueletoDeResumen } from '@/modules/repuestos/pantallas/proyectos-vehiculo'
import { EsqueletoDeFotos } from '@/modules/vehiculos/pantallas/ficha'
import { BloqueSubasta } from './bloque-subasta'
import { BloqueVinculo } from './bloque-vinculo'
import type { PestanaDeVehiculo } from './pestanas'
import { SeccionCotizaciones } from './seccion-cotizaciones'
import { SeccionDocumentos } from './seccion-documentos'
import { EsqueletoDeDocumentos } from './esqueleto-de-documentos'
import { SeccionFicha } from './seccion-ficha'
import { SeccionFotos } from './seccion-fotos'
import { SeccionRepuestos } from './seccion-repuestos'

type Props = {
  pestana: PestanaDeVehiculo
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  // Si quien mira puede editar el vehículo.
  editable: boolean
  // Si quien mira ve leads (para el vínculo y los interesados).
  verLeads: boolean
  // Si, sin el vínculo, iría a la papelera (lo ofrece el aviso de desvinculado tras «Quitar el vínculo»).
  ofrecerPapelera: boolean
  avisos?: AvisosDelMenu
}

// Lo que va debajo de la cabecera según la pestaña de `?seccion=`.
export function ContenidoDeLaPestana({
  pestana,
  vehiculo,
  origen,
  layout,
  editable,
  verLeads,
  ofrecerPapelera,
  avisos,
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
  if (pestana === 'documentos') {
    return (
      // Lee la unidad en el servidor (su fase y su origen), tras la cabecera y las pestañas.
      <Suspense fallback={<EsqueletoDeDocumentos />}>
        <SeccionDocumentos vehiculoId={vehiculo.id} />
      </Suspense>
    )
  }
  if (pestana === 'cotizaciones') {
    return <SeccionCotizaciones vehiculoId={vehiculo.id} />
  }
  if (pestana === 'repuestos') {
    return (
      // El proyecto y sus ítems por fase se leen en el servidor al abrir la pestaña.
      <Suspense fallback={<EsqueletoDeResumen />}>
        <SeccionRepuestos vehiculoId={vehiculo.id} />
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
          <BloqueVinculo
            vehiculo={vehiculo}
            editable={editable}
            ofrecerPapelera={ofrecerPapelera}
            avisos={avisos}
          />
        </Suspense>
      ) : null}
    </>
  )
}
