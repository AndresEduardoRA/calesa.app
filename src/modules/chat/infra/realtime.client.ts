// Las señales de Realtime de la lista de conversaciones. La fila nunca se pinta: ante cualquier señal se relee la cabeza con
// `chat_conversaciones` (que pasa por la RLS y cuenta los no leídos). Sólo `INSERT` y `UPDATE`: Realtime no aplica RLS a los
// `DELETE` (llegarían a todo suscriptor con la clave), y una salida la actualiza la acción que la hizo.
import { suscribirseACambios } from '@/shared/lib/supabase/canal.client'

export type SenalesDeLaLista = {
  // Algo cambió en mis conversaciones.
  alCambiar: () => void
  // El canal se unió, se reconectó o la pestaña volvió a verse: lo que pasó antes no llegó como señal.
  alReconectar: () => void
}

// Dos canales de una tabla cada uno (`canal.client.ts`); `desuscribir()` cierra los dos.
//  - `mensajes` `INSERT` de otra persona: la RLS de `mensajes: leer` decide por suscriptor, así sólo llegan los de mis conversaciones.
//    Lo que escribo yo lo actualiza la acción (`autor_id=neq.<yo>`).
//  - `conversaciones_miembros` `INSERT`/`UPDATE` míos: una directa que otra persona me abre, silenciar o leer desde otra pestaña.
export function suscribirseALaLista(
  usuarioId: string,
  { alCambiar, alReconectar }: SenalesDeLaLista,
): () => void {
  const desdeMensajes = suscribirseACambios({
    tabla: 'mensajes',
    filtro: `autor_id=neq.${usuarioId}`,
    eventos: ['INSERT'],
    alCambiar,
    alReconectar,
  })
  const desdeMiembros = suscribirseACambios({
    tabla: 'conversaciones_miembros',
    filtro: `usuario_id=eq.${usuarioId}`,
    eventos: ['INSERT', 'UPDATE'],
    alCambiar,
    alReconectar,
  })
  return () => {
    desdeMensajes()
    desdeMiembros()
  }
}
