// La escritura de las tablas de referencia (4.23-2): la une `areas/tablas/composicion.ts` con `infra/tablas/publicacion.ts` y la usa la action de `features/tablas/`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { PedidoDePublicarTabla, PublicacionDeTabla } from './publicacion'

export type RepositorioDeTablas = {
  publicar: (pedido: PedidoDePublicarTabla) => Promise<ResultadoDeAccion<PublicacionDeTabla>>
}
