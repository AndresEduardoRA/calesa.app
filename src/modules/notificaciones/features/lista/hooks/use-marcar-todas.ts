'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { marcarTodasLeidas } from '../actions/marcar-todas-leidas'

// «Marcar todas como leídas»: una action por lotes. Si el último lote vino lleno quedan más y la pantalla lo dice,
// para repetir. Sólo pone la fecha de lectura (no acciona); `alMarcar` deja a la vista lo cargado como leído.
export function useMarcarTodas(alMarcar: () => void) {
  const [marcando, setMarcando] = useState(false)
  const [quedanSinMarcar, setQuedanSinMarcar] = useState(false)

  const marcarTodas = async () => {
    if (marcando) {
      return
    }
    setMarcando(true)
    const envio = await enviarAccion(
      marcarTodasLeidas(),
      'No pudimos marcar las notificaciones como leídas.',
    )
    setMarcando(false)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    setQuedanSinMarcar(envio.data.quedanMas)
    alMarcar()
  }

  return { marcando, quedanSinMarcar, marcarTodas }
}
