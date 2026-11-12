// El diálogo de eliminar un documento en la URL de la pantalla que lo muestra (6.06-3): `?panel=eliminar-documento&documento=<id>`. Va aparte del `?vehiculo=` del panel de la unidad.
export const PANEL_ELIMINAR_DOCUMENTO = 'eliminar-documento'
export const CLAVE_DE_DOCUMENTO = 'documento'

export const MENSAJE_DOCUMENTO_YA_NO_ESTA = 'Ese documento ya no está.'

/** El documento que nombra la URL: nulo si falta o si ya no está en la lista. */
export function documentoDeLaUrl<D extends { id: string }>(
  documentos: readonly D[] | null,
  valor: string | null,
): D | null {
  if (valor === null) {
    return null
  }
  return documentos?.find((d) => d.id === valor) ?? null
}

/**
 * Por qué una URL de documento no se abre (nulo = se abre): falta el permiso (aprobar o subir, lo mínimo que la base pide para eliminar) o el id ya no está en la lista. Una URL escrita
 * a mano no abre lo que el permiso no deja.
 */
export function motivoParaNoAbrirDocumento(args: {
  valor: string | null
  encontrado: unknown
  puede: boolean
}): string | null {
  return args.puede && args.encontrado !== null ? null : MENSAJE_DOCUMENTO_YA_NO_ESTA
}
