// Purgar un lote o una de sus cotizaciones, en la URL de la papelera de cotizaciones (`?panel=purgar&lote=<id>` y, para una, `&cotizacion=<id>`; 4.24-2b).
// Nada de React: `features/papelera/hooks/use-purga-por-url.ts` lo usa con `usePanelPorUrl()`.
import type { LoteDeCotizaciones } from './lotes'

export const PANEL_PURGAR = 'purgar'
export const CLAVE_DE_LOTE = 'lote'
export const CLAVE_DE_COTIZACION_A_PURGAR = 'cotizacion'

export const MENSAJE_SIN_PERMISO_DE_PURGAR =
  'No tienes permiso para purgar la papelera de cotizaciones.'

// Por qué `?panel=purgar` no abre (nulo = se puede), en este orden: sin la clave (quien no purga ve sus propios lotes y la URL escrita a mano le abriría
// el diálogo); el lote no está entre los de esta página (se purgó, se restauró o la URL es de otra página); la cotización que nombra no está entre las que se
// ven de ese lote. Se revisa una vez, al llegar.
export function motivoParaNoPurgar(
  lotes: readonly Pick<LoteDeCotizaciones, 'id' | 'cotizaciones'>[],
  loteId: string | null,
  cotizacionId: string | null,
  puedePurgar: boolean,
): string | null {
  if (!puedePurgar) {
    return MENSAJE_SIN_PERMISO_DE_PURGAR
  }
  const lote = lotes.find((l) => l.id === loteId)
  if (!lote) {
    return 'Ese lote ya no está en esta página de la papelera.'
  }
  if (cotizacionId !== null && !lote.cotizaciones.some((c) => c.id === cotizacionId)) {
    return 'Esa cotización ya no está en el lote.'
  }
  return null
}
