import type { EstadoDeRecalculo } from '../recalculo'

export type AvisoDelTotal = 'desactualizado' | 'sin_total' | null

// Lo que «Vista previa» dice del total y lo que apaga «Copiar texto» (4.18-3b, P2): con el último recálculo atrasado y un total, «Total desactualizado.»; sin total (un
// recálculo que falló, una variante sin elegir), no hay qué mandarle al cliente. `estado` es nulo en una guardada: lo guardado no se desactualiza.
export function avisoDelTotal(
  estado: EstadoDeRecalculo | null,
  totalUsd: number | null,
): AvisoDelTotal {
  if (totalUsd === null) {
    return 'sin_total'
  }
  return estado !== null && estado.tipo !== 'al_dia' ? 'desactualizado' : null
}
