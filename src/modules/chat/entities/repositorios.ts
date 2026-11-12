// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Conversacion, CursorDeConversaciones, PaginaDeConversaciones } from './conversaciones'
import type { RespuestaDeEscritura } from './escritura'
import type { PersonasEncontradas } from './personas'

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

// Escribir conversaciones (7.09-2): cada una es una RPC `chat_*` con la sesión de quien actúa.
export type RepositorioDeConversaciones = {
  abrirDirecta: (usuario: string) => RespuestaDeEscritura
  // `id` es el del intento: repetirlo no crea dos grupos.
  crearGrupo: (pedido: {
    id: string
    nombre: string
    miembros: readonly string[]
  }) => RespuestaDeEscritura
  entrarAlGlobal: () => RespuestaDeEscritura
  // Poner, no alternar.
  silenciar: (pedido: { conversacion: string; silenciada: boolean }) => RespuestaDeEscritura
  salir: (conversacion: string) => RespuestaDeEscritura
}

// Personas que se pueden buscar para escribirles (desde el navegador, bajo la RLS de `perfiles`).
export type LectorDePersonas = (
  texto: string,
  yo: string,
) => Promise<Resultado<PersonasEncontradas>>
