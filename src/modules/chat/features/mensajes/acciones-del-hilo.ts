import type { Mensaje } from '../../entities/mensajes'
import type { ContextoDeMenciones } from '../menciones/contexto-de-menciones'
import type { ResultadoDeGuardar } from './hooks/use-edicion'

// Lo que el hilo le da a cada burbuja para actuar sobre su mensaje (7.09-4). Un solo objeto baja por `CuerpoDelHilo` y `ListaDelHilo`.
export type AccionesDelMensaje = {
  usuarioId: string
  // Quien tiene `chat.moderar`: puede borrar lo ajeno. Sólo decide lo que se ofrece; la base lo vuelve a exigir.
  puedeModerar: boolean
  responder: (mensaje: Mensaje) => void
  // El mensaje que se está editando, si hay uno.
  editandoId: string | null
  empezarAEditar: (id: string) => void
  cancelarEdicion: () => void
  pedirBorrado: (id: string) => void
  guardarEdicion: (mensaje: Mensaje, texto: string) => Promise<ResultadoDeGuardar>
  // 7.10-1: lo que el mensaje menciona, resuelto bajo la sesión de quien mira, y cómo abrirlo.
  menciones: ContextoDeMenciones
}
