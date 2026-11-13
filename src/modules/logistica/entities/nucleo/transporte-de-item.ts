import type { UnidadAbierta } from './unidad'

export const TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO =
  'Sigue al vehículo: su transporte es el del vehículo de este proyecto.'
export const TEXTO_DEL_TRANSPORTE_SIN_VEHICULO =
  'Este proyecto no tiene vehículo: el transporte propio de un repuesto todavía no se carga.'

/** Lo que dice el hueco «Transporte» de un ítem de repuesto (D5 de 8.13-2): sigue al vehículo de su proyecto; sin vehículo, que todavía no se carga. */
export function textoDelTransporteDelItem(proyecto: UnidadAbierta['proyecto']): string {
  return proyecto?.vehiculoId
    ? TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO
    : TEXTO_DEL_TRANSPORTE_SIN_VEHICULO
}
