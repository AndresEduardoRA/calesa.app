import type { Resultado } from '@/shared/lib/errores'

// Lo que se manda para publicar el borrador de un origen: la publicada que la pestaña leyó (nula si el origen no tiene), que la base compara (PT409 si cambió).
export type PedidoDePublicar = {
  origenId: string
  nota: string
  publicadaEsperada: string | null
}

// Las escrituras de la fórmula desde Configuración › Cotización (4.20-2b), por las RPC del 4.20-1. Cada una devuelve el id de la versión publicada.
export interface RepositorioDeLaFormula {
  publicar(pedido: PedidoDePublicar): Promise<Resultado<string>>
}
