// Lo que el listado recibe ya resuelto por la página.
import type { FaseResumen } from '@/modules/flujos/client'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  estadoDeVitrina,
  motivosDeNoVisible,
  type EstadoDeVitrina,
  type MotivoDeNoVisible,
  type VitrinaDelOrigen,
} from '../../../entities/vitrina'

export type DatosDelOrigen = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  fases: readonly FaseResumen[]
  categorias: readonly Categoria[]
  // Lo que hace falta para que algo de este origen se vea en la web: de acá sale la insignia.
  vitrina: VitrinaDelOrigen
}

export type FilaDeVehiculo = Vehiculo

// La fase de un vehículo entre las de su origen; null = sin fase (o una que ya no existe).
export function faseDe(fases: readonly FaseResumen[], faseId: string | null): FaseResumen | null {
  return fases.find((fase) => fase.id === faseId) ?? null
}

// El estado de una fila en la vitrina y, si está publicada y no se ve, por qué.
export function vitrinaDe(
  vehiculo: Vehiculo,
  vitrina: VitrinaDelOrigen,
): { estado: EstadoDeVitrina; motivos: MotivoDeNoVisible[] } {
  const estado = estadoDeVitrina(vehiculo, vitrina)
  return { estado, motivos: estado === 'no_visible' ? motivosDeNoVisible(vehiculo, vitrina) : [] }
}
