import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import { FichaDeVehiculo, type Vehiculo } from '@/modules/vehiculos'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
}

// La pestaña «Ficha»: los datos del vehículo según el layout de su origen.
export function SeccionFicha({ vehiculo, origen, layout }: Props) {
  return (
    <FichaDeVehiculo
      vehiculo={vehiculo}
      origen={origen}
      campos={layout.campos}
      categorias={layout.categorias}
    />
  )
}
