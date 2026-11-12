// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Cursor } from '@/shared/lib/paginacion'
import type { Conversacion, CursorDeConversaciones, PaginaDeConversaciones } from './conversaciones'
import type { FalloDeEscritura, RespuestaDeEscritura } from './escritura'
import type { ClaseDeMencion, Referencia } from './menciones'
import type { PaginaDeMensajes } from './mensajes'
import type { PersonasEncontradas } from './personas'
import type { EstadoDeReferencia } from './referencias'
import type { ResultadoDeEdicion } from './reglas-del-mensaje'

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

export type PedidoDePaginaDeMensajes = {
  conversacion: string
  // «Ver anteriores»: lo que viene antes de este mensaje.
  antes?: Cursor
  // «Ir a una fecha»: lo anterior a este instante (exclusivo).
  hasta?: string
  tamano: number
}

// El hilo de una conversación, de a una página, los más nuevos primero (desde el navegador, bajo la RLS de `mensajes`).
export type LectorDeMensajes = (
  pedido: PedidoDePaginaDeMensajes,
) => Promise<Resultado<PaginaDeMensajes>>

// Escribir mensajes (7.09-3): `mensaje_enviar` y `chat_leer` con la sesión de quien actúa.
export type RepositorioDeMensajes = {
  // `id` es el del navegador: reenviarlo es `repetido`, nunca un segundo mensaje.
  enviar: (pedido: {
    id: string
    conversacion: string
    cuerpo: string
    respondeA?: string
    // Los tokens del cuerpo, únicos (7.10-2): la base exige que sean el mismo conjunto.
    menciones?: readonly { tipo: ClaseDeMencion; id: string }[]
  }) => Promise<{ ok: true; data: { id: string; creadoEn: string } } | FalloDeEscritura>
  // Marca leído hasta ese instante (sólo avanza).
  leer: (pedido: { conversacion: string; hasta: string }) => RespuestaDeEscritura
  // 7.09-4: `esperado` es la versión que se leyó (`editadoEn ?? creadoEn`); la base exige autor, 15 minutos y esa versión.
  editar: (pedido: {
    mensaje: string
    esperado: string
    cuerpo: string
  }) => Promise<{ ok: true; data: ResultadoDeEdicion } | FalloDeEscritura>
  // El autor o quien tiene `chat.moderar`; vacía el texto y deja «Mensaje eliminado».
  eliminar: (mensaje: string) => RespuestaDeEscritura
}

// Lo mencionado en el hilo, leído con la sesión de quien mira (7.10-1): una lectura por clase y por tanda, nunca una por mención. Lo que no se ve no
// llega: el mapa lo dice `sin_acceso`. La clave es `<clase>:<id>` (`claveDeReferencia`).
export type LectorDeReferencias = (
  referencias: readonly Referencia[],
) => Promise<Resultado<Map<string, EstadoDeReferencia>>>

// Crear una tarea o un evento desde un mensaje del chat (7.10-3): `mensaje_tarea_crear` y `mensaje_evento_crear` crean la cosa y su ficha en una transacción.
// `id` es el del mensaje, el del formulario al abrirse: reintentar es `repetido`, nunca dos tareas. Quién puede lo dice la base (42501, 23514); el `hint` es el campo.
export type RepositorioDeFichas = {
  crearTarea: (pedido: {
    id: string
    conversacion: string
    datos: { titulo: string; vence_en?: string; responsable_id?: string }
  }) => RespuestaDeEscritura
  crearEvento: (pedido: {
    id: string
    conversacion: string
    datos: { titulo: string; inicia_en: string; visibilidad: 'privado' | 'seleccionados' }
    destinatarios: readonly string[]
  }) => RespuestaDeEscritura
}
