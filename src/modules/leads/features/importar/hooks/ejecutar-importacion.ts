import type { Envio } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { PedidoDeFila } from '../../../entities/importacion/filas'
import type { ResultadoDeFila } from '../../../entities/importacion/lotes'

// Cómo terminó una pasada por los lotes.
export type FinDeLaPasada =
  // Todos los lotes tienen respuesta.
  | { tipo: 'completa' }
  // La persona canceló entre dos lotes: lo hecho queda hecho.
  | { tipo: 'cancelada' }
  // El pedido no llegó: se reanuda con los mismos lotes y los mismos ids, sin duplicar.
  | { tipo: 'sin_red' }
  // La base o el servidor lo rechazaron: reintentar tal cual no cambia nada.
  | { tipo: 'rechazada'; error: ErrorApp }

type Entrada = {
  lotes: readonly (readonly PedidoDeFila[])[]
  // Lo que ya se sabe de cada fila (por su id). Se completa a medida que llegan los lotes.
  resultados: Map<string, ResultadoDeFila>
  enviar: (lote: readonly PedidoDeFila[]) => Promise<Envio<ResultadoDeFila[]>>
  cancelado: () => boolean
  // Cada vez que un lote tiene respuesta.
  alAvanzar: () => void
}

const tieneRespuesta = (
  lote: readonly PedidoDeFila[],
  resultados: ReadonlyMap<string, ResultadoDeFila>,
) => lote.every((pedido) => resultados.has(pedido.id))

// Una pasada por los lotes, de a uno y en orden. Salta los que ya tienen respuesta (una reanudación) y
// para entre lotes si se canceló. Nada lo que hace es un efecto de React: es lo que se prueba.
export async function ejecutarImportacion(entrada: Entrada): Promise<FinDeLaPasada> {
  const { lotes, resultados, enviar, cancelado, alAvanzar } = entrada
  for (const lote of lotes) {
    if (tieneRespuesta(lote, resultados)) {
      continue
    }
    if (cancelado()) {
      return { tipo: 'cancelada' }
    }
    const envio = await enviar(lote)
    if (!envio.ok) {
      return 'sinRed' in envio ? { tipo: 'sin_red' } : { tipo: 'rechazada', error: envio.error }
    }
    for (const resultado of envio.data) {
      resultados.set(resultado.id, resultado)
    }
    alAvanzar()
  }
  return { tipo: 'completa' }
}
