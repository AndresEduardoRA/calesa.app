// Los paneles del hueco «Pagos» en la URL de la pantalla que lo muestra (6.11-2): `?panel=pago&pago=<id|nuevo>` abre el formulario; `?panel=confirmar-pago`, `?panel=eliminar-pago` y
// `?panel=anular-pago` con `&pago=<id>`, sus diálogos. Van aparte del `?vehiculo=` del panel de la unidad.
export const PANEL_PAGO = 'pago'
export const PANEL_CONFIRMAR_PAGO = 'confirmar-pago'
export const PANEL_ELIMINAR_PAGO = 'eliminar-pago'
export const PANEL_ANULAR_PAGO = 'anular-pago'
export const CLAVE_DE_PAGO = 'pago'
export const PAGO_NUEVO = 'nuevo'

export const MENSAJE_PAGO_YA_NO_ESTA = 'Ese pago ya no está.'

type PanelDePago =
  | typeof PANEL_PAGO
  | typeof PANEL_CONFIRMAR_PAGO
  | typeof PANEL_ELIMINAR_PAGO
  | typeof PANEL_ANULAR_PAGO

/** El pago que nombra la URL: nulo si falta, si es `nuevo` o si ya no está en la lista. */
export function pagoDeLaUrl<P extends { id: string }>(
  pagos: readonly P[] | null,
  valor: string | null,
): P | null {
  if (valor === null || valor === PAGO_NUEVO) {
    return null
  }
  return pagos?.find((p) => p.id === valor) ?? null
}

/**
 * Por qué una URL de pago no se abre (nulo = se abre): falta el permiso que pide el panel, el id ya no está o el pago no está en el estado que el panel pide (editar, confirmar y eliminar
 * piden sin confirmar; anular pide confirmado). `nuevo` sólo es de `pago` y pide editar. Una URL escrita a mano no abre lo que el permiso o el estado no dejan.
 */
export function motivoParaNoAbrirPago(args: {
  panel: PanelDePago
  valor: string | null
  encontrado: { confirmado: boolean } | null
  // `puedeAnular` (8.13-5): un pago de proyecto no se anula todavía; sin él, anular sigue a confirmar.
  permisos: { puedeEditar: boolean | null; puedeConfirmar: boolean | null; puedeAnular?: boolean }
}): string | null {
  const { panel, valor, encontrado, permisos } = args
  const permitido =
    panel === PANEL_PAGO || panel === PANEL_ELIMINAR_PAGO
      ? permisos.puedeEditar
      : panel === PANEL_ANULAR_PAGO
        ? (permisos.puedeAnular ?? permisos.puedeConfirmar)
        : permisos.puedeConfirmar
  if (!permitido) {
    return MENSAJE_PAGO_YA_NO_ESTA
  }
  if (panel === PANEL_PAGO && valor === PAGO_NUEVO) {
    return null
  }
  if (encontrado === null) {
    return MENSAJE_PAGO_YA_NO_ESTA
  }
  const pideConfirmado = panel === PANEL_ANULAR_PAGO
  return encontrado.confirmado === pideConfirmado ? null : MENSAJE_PAGO_YA_NO_ESTA
}
