import type { Pago } from './pago'

export type AccionesDelPago = {
  editar: boolean
  eliminar: boolean
  confirmar: boolean
  anular: boolean
}

/**
 * Qué botones ofrece un pago. Un confirmado nunca se edita ni se elimina, aunque quien mira lo pueda todo (D4); sólo se anula, y sólo con la clave de confirmar. La base vuelve a exigirlo.
 * `puedeAnular` (8.13-5) apaga «Anular» aunque se pueda confirmar (un pago de proyecto no se anula todavía, 8-13d); sin él, anular sigue a confirmar.
 */
export function accionesDelPago(
  pago: Pick<Pago, 'confirmado'>,
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean; puedeAnular?: boolean },
): AccionesDelPago {
  const sinConfirmar = !pago.confirmado
  return {
    editar: permisos.puedeEditar && sinConfirmar,
    eliminar: permisos.puedeEditar && sinConfirmar,
    confirmar: permisos.puedeConfirmar && sinConfirmar,
    anular: (permisos.puedeAnular ?? permisos.puedeConfirmar) && pago.confirmado,
  }
}
