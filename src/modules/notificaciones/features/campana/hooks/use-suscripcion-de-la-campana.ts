'use client'

import { useEffect } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { suscribirseACambios } from '@/shared/lib/supabase/canal.client'
import { contarNotificacionesNoLeidas } from '../../../composicion.client'

// El contador de la campana. Se lee al montar (no en el layout: el marco no paga una consulta por request) y
// cada vez que Realtime avisa de un INSERT o UPDATE propio, al reconectar y al volver a la pestaña. La fila
// que viaja por el canal es sólo señal: el número sale de releer. `alSenal` avisa al popover abierto que relea
// su lista. Nunca `DELETE`: no pasa por RLS (`notificaciones/CLAUDE.md`).
export function useSuscripcionDeLaCampana(
  usuarioId: string,
  alConteo: (conteo: ConteoAcotado) => void,
  alSenal: () => void,
) {
  useEffect(() => {
    let vigente = true
    const releer = () => {
      void contarNotificacionesNoLeidas()
        .then((lectura) => {
          // Un fallo deja el número que había: la campana no se rompe por una lectura.
          if (vigente && lectura.ok) {
            alConteo(lectura.data)
          }
        })
        .catch(() => undefined)
      alSenal()
    }
    releer()
    const desuscribir = suscribirseACambios({
      tabla: 'notificaciones',
      filtro: `usuario_id=eq.${usuarioId}`,
      eventos: ['INSERT', 'UPDATE'],
      alCambiar: releer,
      alReconectar: releer,
    })
    return () => {
      vigente = false
      desuscribir()
    }
  }, [usuarioId, alConteo, alSenal])
}
