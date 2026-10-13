import type { ReactNode } from 'react'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { leerLayout, type OrigenResumen } from '@/modules/origenes'
import { FichaDeVehiculo, type Vehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  acciones?: ReactNode
}

// La pestaña «Ficha»: los datos del vehículo según el layout de su origen, con su fase actual.
export async function SeccionFicha({ vehiculo, origen, acciones }: Props) {
  const [layout, fases] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerFasesDeOrigen(origen.id),
  ])
  const { campos, categorias } = datosO(layout)
  return (
    <FichaDeVehiculo
      vehiculo={vehiculo}
      origen={origen}
      campos={campos}
      categorias={categorias}
      fase={datosO(fases).find((fase) => fase.id === vehiculo.faseId) ?? null}
      acciones={acciones}
    />
  )
}
