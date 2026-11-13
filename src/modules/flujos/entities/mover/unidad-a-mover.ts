// La unidad que se mueve de fase: un vehículo o un ítem de repuesto, uno y sólo uno (8.13-1). La base ya acepta las dos (`cambiar_fase(p_vehiculo, p_repuesto, …)`); aquí
// se dice cómo cruza el límite de la action y cómo se manda a la base. Reglas puras, sin I/O.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

export type UnidadAMover =
  { tipo: 'vehiculo'; vehiculoId: string } | { tipo: 'repuesto'; repuestoId: string }

export const MENSAJE_UNIDAD_A_MOVER = 'Indica un vehículo o un repuesto, no los dos ni ninguno.'
export const MENSAJE_ORIGEN_DEL_VEHICULO = 'Falta el origen del vehículo.'

/** El id de la unidad, sea cual sea su tipo. */
export function idDeUnidadAMover(unidad: UnidadAMover): string {
  return unidad.tipo === 'vehiculo' ? unidad.vehiculoId : unidad.repuestoId
}

/**
 * Lo que llega del formulario o del hook (`vehiculo` xor `repuesto`) como una unidad. El origen sólo se pide para un vehículo (`exigirOrigen`): un ítem de repuesto no
 * tiene origen y su permiso es global.
 */
export function unidadDelPedido(
  pedido: { vehiculo?: string; repuesto?: string; origenId?: string },
  exigirOrigen: boolean,
): Resultado<{ unidad: UnidadAMover; origenId: string | null }> {
  const { vehiculo, repuesto, origenId } = pedido
  if (vehiculo !== undefined && repuesto === undefined) {
    if (exigirOrigen && origenId === undefined)
      return fallo('validacion', MENSAJE_ORIGEN_DEL_VEHICULO)
    return ok({ unidad: { tipo: 'vehiculo', vehiculoId: vehiculo }, origenId: origenId ?? null })
  }
  if (repuesto !== undefined && vehiculo === undefined) {
    return ok({ unidad: { tipo: 'repuesto', repuestoId: repuesto }, origenId: null })
  }
  return fallo('validacion', MENSAJE_UNIDAD_A_MOVER)
}
