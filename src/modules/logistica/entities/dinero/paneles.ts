// Los paneles del hueco «Gastos» en la URL de la pantalla que lo muestra (6.11-1): `?panel=gasto&gasto=<id|nuevo>` abre el formulario y `?panel=eliminar-gasto&gasto=<id>`, la
// confirmación de eliminar. Van aparte del `?vehiculo=` del panel de la unidad.
export const PANEL_GASTO = 'gasto'
export const PANEL_ELIMINAR_GASTO = 'eliminar-gasto'
// El diálogo de «Prorratear» del resumen de un grupo (`?panel=prorratear`, 6.11-4): nombra el reparto antes de escribir nada.
export const PANEL_PRORRATEAR = 'prorratear'
export const CLAVE_DE_GASTO = 'gasto'
export const GASTO_NUEVO = 'nuevo'

export const MENSAJE_GASTO_YA_NO_ESTA = 'Ese gasto ya no está.'

type ConGasto = { id: string }

/** El gasto que nombra la URL: nulo si falta, si es `nuevo` o si ya no está en la lista. */
export function gastoDeLaUrl<G extends ConGasto>(
  gastos: readonly G[] | null,
  valor: string | null,
): G | null {
  if (valor === null || valor === GASTO_NUEVO) {
    return null
  }
  return gastos?.find((g) => g.id === valor) ?? null
}

/**
 * Por qué una URL de gasto no se abre (nulo = se abre): sin permiso de editar, o con un id que ya no está. `nuevo` sólo pide el permiso; `eliminar` nunca admite `nuevo`.
 */
export function motivoParaNoAbrirGasto(args: {
  valor: string | null
  encontrado: unknown
  puedeEditar: boolean | null
  admiteNuevo: boolean
}): string | null {
  const { valor, encontrado, puedeEditar, admiteNuevo } = args
  if (!puedeEditar) {
    return MENSAJE_GASTO_YA_NO_ESTA
  }
  if (admiteNuevo && valor === GASTO_NUEVO) {
    return null
  }
  return encontrado === null ? MENSAJE_GASTO_YA_NO_ESTA : null
}
