import type { Conversacion } from '../../../entities/conversaciones'

// Lo que comparten los paneles de `/tarea` y `/evento`.
export type PropsDePanelDeFicha = {
  abierto: boolean
  alCerrar: () => void
  conversacion: Pick<Conversacion, 'id' | 'otro'>
  usuarioId: string
  zona: string
  // Lo escrito tras el comando: el título de partida.
  titulo: string
  // Tras crear: se cierra el panel y se relee el hilo.
  alCrear: () => void
}
