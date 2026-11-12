import type { Unidad } from '../../../entities/nucleo/unidad'

/** La unidad como la pide el motor de mover de `flujos` (8.13-2): un vehículo con su origen, o un ítem de repuesto sin él (`vehiculo` xor `repuesto`). */
export function unidadAMover(
  unidad: Pick<Unidad, 'tipo' | 'id' | 'origenId'>,
): { vehiculo: string; origenId: string } | { repuesto: string } {
  if (unidad.tipo === 'repuesto' || unidad.origenId === null) return { repuesto: unidad.id }
  return { vehiculo: unidad.id, origenId: unidad.origenId }
}
