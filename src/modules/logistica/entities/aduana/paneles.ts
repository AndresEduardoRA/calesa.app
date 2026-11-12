// Los paneles de `/logistica/aduana` en la URL (6.09): `?declaracion=<id>` abre el resumen; `?panel=nueva-declaracion` y `?panel=editar-declaracion&declaracion=<id>` el formulario, y
// `?panel=canal&declaracion=<id>` la confirmación de asignar el canal. 6.09-1 sólo abre el resumen; los otros los usa 6.09-2. Un solo `declaracion` para el resumen y el formulario: son
// dos usos de la misma clave y no conviven (D8).
export const PANEL_NUEVA_DECLARACION = 'nueva-declaracion'
export const PANEL_EDITAR_DECLARACION = 'editar-declaracion'
export const PANEL_CANAL = 'canal'
export const CLAVE_DE_DECLARACION = 'declaracion'
export const CLAVE_DE_RESUMEN = CLAVE_DE_DECLARACION
export const DECLARACION_NUEVA = 'nueva'

export const MENSAJE_DECLARACION_YA_NO_ESTA = 'Esa declaración ya no está.'

/**
 * Por qué una URL de declaración no se abre (nulo = se abre): sin permiso de gestionar, o con un id que ya no está. `nueva` sólo pide el permiso y sólo la admite el alta.
 */
export function motivoParaNoAbrirDeclaracion(args: {
  valor: string | null
  encontrada: unknown
  puedeGestionar: boolean | null
  admiteNueva: boolean
}): string | null {
  const { valor, encontrada, puedeGestionar, admiteNueva } = args
  if (!puedeGestionar) {
    return MENSAJE_DECLARACION_YA_NO_ESTA
  }
  if (admiteNueva && valor === DECLARACION_NUEVA) {
    return null
  }
  return encontrada === null ? MENSAJE_DECLARACION_YA_NO_ESTA : null
}
