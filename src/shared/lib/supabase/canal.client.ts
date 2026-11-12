// Realtime de una tabla como señal: «algo cambió, vuelve a leer». Nunca entrega la fila: quien llama relee con su
// consulta (que pasa por la RLS) y no pinta nada de lo que viaja por el canal. Los `DELETE` no pasan por RLS en
// Realtime (llegan a todo suscriptor con la clave): quien no los necesita no los pide.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from './browser'

type Evento = 'INSERT' | 'UPDATE' | 'DELETE'

export type OpcionesDeCanal = {
  tabla: string
  // Un filtro de postgres_changes, p. ej. `usuario_id=eq.<id>`. Sin filtro llega toda fila que la RLS le deje ver a quien se suscribe.
  filtro?: string
  eventos: readonly Evento[]
  alCambiar: () => void
  // El canal se unió (la primera vez o tras un corte) o la pestaña volvió a verse: lo que pasó antes no llegó como señal.
  alReconectar: () => void
}

let contador = 0

// Devuelve el `desuscribir()`. El reintento ante un corte es el de supabase-js.
//
// El canal se une **después** de pedirle a Realtime el token de la sesión (`realtime.setAuth()`): si se une antes
// entra como `anon`, que no puede leer la tabla, y Realtime rechaza el filtro («invalid column for filter»). Un
// `desuscribir()` que llega antes de que el canal exista lo cancela.
export function suscribirseACambios({
  tabla,
  filtro,
  eventos,
  alCambiar,
  alReconectar,
}: OpcionesDeCanal): () => void {
  const cliente = createClient()
  contador += 1
  const nombre = `cambios:${tabla}:${contador}`
  let canal: RealtimeChannel | null = null
  let cerrado = false

  const armar = () => {
    if (cerrado) {
      return
    }
    let nuevo = cliente.channel(nombre)
    for (const event of eventos) {
      nuevo = nuevo.on(
        'postgres_changes',
        { event, schema: 'public', table: tabla, ...(filtro ? { filter: filtro } : {}) },
        () => alCambiar(),
      )
    }
    nuevo.subscribe((estado) => {
      if (cerrado) {
        return
      }
      if (estado === 'SUBSCRIBED') {
        // Lo que cambió entre la lectura de la pantalla y la unión del canal (la primera vez) o durante un corte no
        // llegó como señal: al unirse, siempre se relee.
        alReconectar()
      }
    })
    canal = nuevo
  }

  // Un fallo al pedir el token no impide suscribirse: el canal entra con el que tenga.
  void cliente.realtime
    .setAuth()
    .catch(() => undefined)
    .then(armar)

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
    if (canal) {
      void cliente.removeChannel(canal)
    }
  }
}
