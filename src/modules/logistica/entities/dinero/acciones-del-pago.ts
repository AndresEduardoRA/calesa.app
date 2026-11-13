import type { Pago } from './pago'

export type AccionesDelPago = {
  editar: boolean
  eliminar: boolean
  confirmar: boolean
  anular: boolean
}

/**
 * Qué botones ofrece un pago. Un confirmado nunca se edita ni se elimina, aunque quien mira lo pueda todo (D4); sólo se anula, y sólo con la clave de confirmar. La base vuelve a exigirlo.
 */
export function accionesDelPago(
  pago: Pick<Pago, 'confirmado'>,
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean },
): AccionesDelPago {
  const sinConfirmar = !pago.confirmado
  return {
    editar: permisos.puedeEditar && sinConfirmar,
    eliminar: permisos.puedeEditar && sinConfirmar,
    confirmar: permisos.puedeConfirmar && sinConfirmar,
    anular: permisos.puedeConfirmar && pago.confirmado,
  }
}
