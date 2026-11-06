import { CotizacionesDelVehiculo } from '@/modules/cotizaciones/pantallas/vehiculo'

// La pestaña «Cotizaciones»: las del vehículo que quien mira ve. No lee nada en el servidor: la lista se lee desde el navegador al montarse (la ficha no paga nada
// hasta abrir la pestaña), y la `key` empieza de cero al pasar de un vehículo a otro.
export function SeccionCotizaciones({ vehiculoId }: { vehiculoId: string }) {
  return <CotizacionesDelVehiculo key={vehiculoId} vehiculoId={vehiculoId} />
}
