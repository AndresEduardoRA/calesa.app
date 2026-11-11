// Realtime de una tabla como señal: «algo cambió, vuelve a leer». Nunca entrega la fila: quien llama relee con su
// consulta (que pasa por la RLS) y no pinta nada de lo que viaja por el canal. Los `DELETE` no pasan por RLS en
// Realtime (llegan a todo suscriptor con la clave): quien no los necesita no los pide.
import { createClient } from './browser'

type Evento = 'INSERT' | 'UPDATE' | 'DELETE'

export type OpcionesDeCanal = {
  tabla: string
  // Un filtro de postgres_changes, p. ej. `usuario_id=eq.<id>`.
  filtro: string
  eventos: readonly Evento[]
  alCambiar: () => void
  // El canal volvió tras un corte o la pestaña volvió a verse: lo que pasó mientras tanto no llegó como señal.
  alReconectar: () => void
}

const SIN_CONEXION = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])

let contador = 0

// Devuelve el `desuscribir()`. El reintento ante un corte es el de supabase-js.
export function suscribirseACambios({
  tabla,
  filtro,
  eventos,
  alCambiar,
  alReconectar,
}: OpcionesDeCanal): () => void {
  const cliente = createClient()
  contador += 1
  let canal = cliente.channel(`cambios:${tabla}:${contador}`)
  for (const event of eventos) {
    canal = canal.on(
      'postgres_changes',
      { event, schema: 'public', table: tabla, filter: filtro },
      () => alCambiar(),
    )
  }

  let cerrado = false
  let huboCorte = false
  canal.subscribe((estado) => {
    if (cerrado) {
      return
    }
    if (estado === 'SUBSCRIBED') {
      if (huboCorte) {
        huboCorte = false
        alReconectar()
      }
    } else if (SIN_CONEXION.has(estado)) {
      huboCorte = true
    }
  })

  const alCambiarLaVisibilidad = () => {
    if (!cerrado && document.visibilityState === 'visible') {
      alReconectar()
    }
  }
  document.addEventListener('visibilitychange', alCambiarLaVisibilidad)

  return () => {
    if (cerrado) {
      return
    }
    cerrado = true
    document.removeEventListener('visibilitychange', alCambiarLaVisibilidad)
    void cliente.removeChannel(canal)
  }
}
