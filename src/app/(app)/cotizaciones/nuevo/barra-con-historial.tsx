import { type contarCotizacionesDelVehiculo, CLAVE_DE_VEHICULO } from '@/modules/cotizaciones'
import { HistorialDelVehiculo } from '@/modules/cotizaciones/pantallas/cotizar'
import type { AltaDelPanel, ParaElegir } from '@/modules/vehiculos/pantallas/cotizar'
import type { VehiculoElegido } from '@/modules/vehiculos'
import { conteoCorto } from '@/shared/lib/conteo'
import { BarraDeLaHoja } from './barra-de-la-hoja'

// La barra del vehículo con su «Cotizado (n)» y su historial. Lo une esta página: `vehiculos` recibe el historial armado, sin importar `cotizaciones`. Sin elegido (soltado
// por la hoja, inexistente o que no se ve) no hay insignia ni historial; un conteo que falló es sólo una etiqueta menos. Plegado, el historial se lee al desplegarlo.
export function BarraConHistorial({
  origen,
  elegido,
  conteo,
  alta,
  puedeVer,
  paraElegir,
  abierta,
}: {
  origen: { id: string; tipo: string }
  elegido: VehiculoElegido | null
  conteo: Awaited<ReturnType<typeof contarCotizacionesDelVehiculo>> | null
  alta: AltaDelPanel | null
  puedeVer: boolean
  paraElegir: ParaElegir | null
  abierta: string
}) {
  const cotizado = elegido && conteo?.ok ? conteo.data : null
  // El «n» de la insignia ya escrito («2», «20+»); con 0, sin insignia. La barra va en la carga en frío de la hoja y recibe el texto, no el conteo.
  const insignia = cotizado !== null && cotizado.n > 0 ? conteoCorto(cotizado) : null
  return (
    <BarraDeLaHoja
      origenId={origen.id}
      esSubasta={origen.tipo === 'subasta'}
      elegido={elegido}
      alta={alta}
      puedeVer={puedeVer}
      claveDeLaUrl={CLAVE_DE_VEHICULO}
      cotizado={insignia}
      paraElegir={paraElegir}
      abierta={abierta}
      historial={
        elegido ? (
          <HistorialDelVehiculo key={elegido.id} vehiculoId={elegido.id} conteo={cotizado} />
        ) : null
      }
    />
  )
}
