import type { Referencia } from '../../entities/menciones'
import type { EstadoDeReferencia } from '../../entities/referencias'

// Lo que el hilo le da a cada burbuja para dibujar y abrir lo que un mensaje menciona (7.10-1). `estadoDe`: nulo mientras no se leyó, `'error'` si la
// lectura falló.
export type ContextoDeMenciones = {
  estadoDe: (referencia: Referencia) => EstadoDeReferencia | 'error' | null
  reintentar: () => void
  abrir: (referencia: Referencia) => void
}
