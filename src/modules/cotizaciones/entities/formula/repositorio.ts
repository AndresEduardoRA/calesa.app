import type { Resultado } from '@/shared/lib/errores'

// Lo que se manda para publicar el borrador de un origen: la publicada que la pestaña leyó (nula si el origen no tiene), que la base compara (PT409 si cambió).
export type PedidoDePublicar = {
  origenId: string
  nota: string
  publicadaEsperada: string | null
}

// Lo que se manda para revertir a una versión archivada: la publicada que se leyó, siempre (sin publicada no se revierte).
export type PedidoDeRevertir = {
  origenId: string
  versionId: string
  nota: string
  publicadaEsperada: string
}

// Lo que se manda para descartar el borrador de un origen (4.20-2c): sólo el origen; la base borra el que haya, sin versión esperada (llega en el 4.21).
export type PedidoDeDescartar = {
  origenId: string
}

// Las escrituras de la fórmula desde Configuración › Cotización (4.20-2b y 2c), por las RPC del 4.20-1 y la de descartar. Publicar y revertir devuelven el id de la
// versión publicada; descartar, nada.
export interface RepositorioDeLaFormula {
  publicar(pedido: PedidoDePublicar): Promise<Resultado<string>>
  revertir(pedido: PedidoDeRevertir): Promise<Resultado<string>>
  descartar(pedido: PedidoDeDescartar): Promise<Resultado<null>>
}
