'use client'

import { useRegional } from '@/shared/ui/regional'
import type { CampoDeVehiculo } from '../../../entities/campo'
import {
  campoPrincipalDe,
  identidadDeVehiculo,
  type IdentidadDeVehiculo,
} from '../../../entities/identidad'

type Nombrable = { titulo: string; atributos: Record<string, unknown> }

// Cómo se nombra cada vehículo de un origen: por su campo principal (con el formato de la
// empresa) o, sin él, por su título.
export function useIdentidad(
  campos: readonly CampoDeVehiculo[],
): (vehiculo: Nombrable) => IdentidadDeVehiculo {
  const { locale, zonaHoraria } = useRegional()
  const principal = campoPrincipalDe(campos)
  return (vehiculo) => identidadDeVehiculo(vehiculo, principal, { locale, zona: zonaHoraria })
}
