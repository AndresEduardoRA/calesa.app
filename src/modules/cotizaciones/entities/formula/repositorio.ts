import type { ErrorApp, Resultado } from '@/shared/lib/errores'

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

// Lo que se manda para cambiar el valor por defecto de una constante desde el ⚙ de la hoja (4.20-3a): el valor ya en la unidad de `params` (un porcentaje como fracción)
// y la publicada que se leyó, siempre: la base la compara (PT409 si cambió) y publica la N+1 sin tocar el borrador.
export type PedidoDeCambiarConstante = {
  origenId: string
  nodo: string
  valor: number
  publicadaEsperada: string
}

// El id de la versión nueva, o el error; `campo` dice que el rechazo es del valor tipeado (el 22023 con `hint = 'valor'`: «La constante ya tiene ese valor.»).
export type ResultadoDelCambio =
  { ok: true; data: string } | { ok: false; error: ErrorApp; campo?: 'valor' }

// Las escrituras de la fórmula desde Configuración › Cotización (4.20-2b y 2c), por las RPC del 4.20-1 y la de descartar. Publicar y revertir devuelven el id de la
// versión publicada; descartar, nada;
// cambiar una constante (el ⚙ de la hoja, 4.20-3a) publica la N+1 y devuelve su id.
export interface RepositorioDeLaFormula {
  publicar(pedido: PedidoDePublicar): Promise<Resultado<string>>
  revertir(pedido: PedidoDeRevertir): Promise<Resultado<string>>
  descartar(pedido: PedidoDeDescartar): Promise<Resultado<null>>
  cambiarConstante(pedido: PedidoDeCambiarConstante): Promise<ResultadoDelCambio>
}
