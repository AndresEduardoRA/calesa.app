// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Conversacion, CursorDeConversaciones, PaginaDeConversaciones } from './conversaciones'

export type PedidoDePaginaDeConversaciones = {
  desde?: CursorDeConversaciones
  tamano: number
}

// Mis conversaciones, la más reciente primero, por cursor (RPC `chat_conversaciones`).
export type LectorDePaginaDeConversaciones = (
  pedido: PedidoDePaginaDeConversaciones,
) => Promise<Resultado<PaginaDeConversaciones>>

// Una conversación por su id, o `null` si no es mía (salí, la borraron o perdí `chat.global`).
export type LectorDeUnaConversacion = (
  usuarioId: string,
  id: string,
) => Promise<Resultado<Conversacion | null>>
