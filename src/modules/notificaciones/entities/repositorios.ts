// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type {
  Notificacion,
  PaginaDeNotificaciones,
  PedidoDePagina,
  ResultadoDeMarcado,
} from './notificacion'

export type LectorDePaginaDeNotificaciones = (
  pedido: PedidoDePagina,
) => Promise<Resultado<PaginaDeNotificaciones>>

export type RepositorioDeNotificaciones = {
  // Marca leída (y accionada si `accionar`) la propia, una sola vez; devuelve la fila como quedó.
  abrir(usuarioId: string, id: number, accionar: boolean): Promise<Resultado<Notificacion | null>>
  // Lee la propia por su id (para decidir si abrirla acciona): null si no existe o no es suya.
  leer(usuarioId: string, id: number): Promise<Resultado<Notificacion | null>>
  // Marca leídas las no leídas, por lotes de `LOTE_DE_MARCADO`, hasta `lotes`.
  marcarTodasLeidas(usuarioId: string, lotes: number): Promise<Resultado<ResultadoDeMarcado>>
}
