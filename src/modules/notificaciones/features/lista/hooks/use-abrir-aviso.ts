'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import type { Notificacion } from '../../../entities/notificacion'
import { abrirNotificacion } from '../../lista/actions/abrir-notificacion'

// Abrir un aviso: se ve leído de inmediato y la action lo marca en la base (leído, y accionado sólo si su tipo lo
// dice). No bloquea la navegación. Si no llegó, avisa: la fila vuelve a verse como estaba en la próxima lectura.
export function useAbrirAviso() {
  const [leidasAqui, setLeidasAqui] = useState<ReadonlySet<number>>(new Set())

  function abrir(aviso: Notificacion) {
    setLeidasAqui((antes) => new Set(antes).add(aviso.id))
    if (aviso.leida && !aviso.requiereAccion) {
      return
    }
    void enviarAccion(
      abrirNotificacion({ id: aviso.id }),
      'No pudimos marcar el aviso como leído.',
    ).then((envio) => {
      if (!envio.ok) {
        avisarError(envio.error)
      }
    })
  }

  return { leidasAqui, abrir }
}
