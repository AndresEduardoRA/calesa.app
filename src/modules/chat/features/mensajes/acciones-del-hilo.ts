import type { Mensaje } from '../../entities/mensajes'

// Lo que el hilo le da a cada burbuja para actuar sobre su mensaje (7.09-4). Un solo objeto baja por `CuerpoDelHilo` y `ListaDelHilo`.
export type AccionesDelMensaje = {
  responder: (mensaje: Mensaje) => void
}
