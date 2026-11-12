import type { Mensaje } from '../../entities/mensajes'
import type { ResultadoDeGuardar } from './hooks/use-edicion'

// Lo que el hilo le da a cada burbuja para actuar sobre su mensaje (7.09-4). Un solo objeto baja por `CuerpoDelHilo` y `ListaDelHilo`.
export type AccionesDelMensaje = {
  usuarioId: string
  responder: (mensaje: Mensaje) => void
  // El mensaje que se está editando, si hay uno.
  editandoId: string | null
  empezarAEditar: (id: string) => void
  cancelarEdicion: () => void
  guardarEdicion: (mensaje: Mensaje, texto: string) => Promise<ResultadoDeGuardar>
}
