// Lo que el listado recibe ya resuelto por la página.
import type { FaseResumen } from '@/modules/flujos/client'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import type { Vehiculo } from '../../../entities/vehiculo'

export type DatosDelOrigen = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  fases: readonly FaseResumen[]
  categorias: readonly Categoria[]
}

export type FilaDeVehiculo = Vehiculo

// La fase de un vehículo entre las de su origen; null = sin fase (o una que ya no existe).
export function faseDe(fases: readonly FaseResumen[], faseId: string | null): FaseResumen | null {
  return fases.find((fase) => fase.id === faseId) ?? null
}
