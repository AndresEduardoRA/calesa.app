import type { LoteDePapelera } from './papelera'

// Purgar un lote o uno de sus vehículos, en la URL de la papelera (`?panel=purgar&lote=<id>` y, para uno, `&vehiculo=<id>`).
export const PANEL_PURGAR = 'purgar'
export const CLAVE_DE_LOTE = 'lote'
export const CLAVE_DE_VEHICULO_A_PURGAR = 'vehiculo'
export const MENSAJE_DE_LOTE_NO_DISPONIBLE = 'Ese lote ya no está en esta página de la papelera.'

// Por qué `?panel=purgar` no abre (nulo = se puede): el lote no está entre los de esta página (se purgó, se restauró, o la URL es
// de otra página) o el vehículo que nombra no es de ese lote. Se revisa una vez, al llegar.
export function motivoParaNoPurgar(
  lotes: readonly LoteDePapelera[],
  loteId: string | null,
  vehiculoId: string | null,
): string | null {
  const lote = lotes.find((l) => l.id === loteId)
  if (!lote) {
    return MENSAJE_DE_LOTE_NO_DISPONIBLE
  }
  if (vehiculoId !== null && !lote.vehiculos.some((vehiculo) => vehiculo.id === vehiculoId)) {
    return 'Ese vehículo ya no está en el lote.'
  }
  return null
}
