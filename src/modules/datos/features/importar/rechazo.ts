// El rechazo de una fila que la conversión no pudo armar (D33): todos sus motivos unidos con «; » y, como campo, la etiqueta de lo que la
// persona emparejó en el primero (o nada, si el motivo es de la fila). Los topes los vuelve a cortar `normalizarFila`.
import type { FilaNormalizada } from '../../entities/plantillas'

export type MotivoConCampo = { campo: string | null; motivo: string }

const MAX_MOTIVO = 500
const MAX_CAMPO = 120

export function rechazoDeMotivos(
  motivos: readonly MotivoConCampo[],
  etiquetaDe: (id: string) => string | undefined,
): FilaNormalizada {
  const motivo = motivos
    .map((uno) => uno.motivo)
    .join('; ')
    .slice(0, MAX_MOTIVO)
  const primero = motivos[0]?.campo ?? null
  const campo = primero === null ? '' : (etiquetaDe(primero) ?? primero).slice(0, MAX_CAMPO)
  return { rechazo: campo === '' ? { motivo } : { motivo, campo } }
}
