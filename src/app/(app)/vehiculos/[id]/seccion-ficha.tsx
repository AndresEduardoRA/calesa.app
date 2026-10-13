import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import { FichaDeVehiculo, type Vehiculo } from '@/modules/vehiculos'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  fases: readonly FaseResumen[]
  acciones?: ReactNode
}

// La pestaña «Ficha»: los datos del vehículo según el layout de su origen, con su fase actual.
export function SeccionFicha({ vehiculo, origen, layout, fases, acciones }: Props) {
  return (
    <FichaDeVehiculo
      vehiculo={vehiculo}
      origen={origen}
      campos={layout.campos}
      categorias={layout.categorias}
      fase={fases.find((fase) => fase.id === vehiculo.faseId) ?? null}
      acciones={acciones}
    />
  )
}
