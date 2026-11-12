'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { confirmarContacto } from '../../actions/confirmar-contacto'

// «Contacté» de una tarjeta (8.05-1): un toque, sin confirmación ni «Deshacer». Una escritura a la vez; al `ok` se relee Inicio y la tarjeta se va; si falla, el motivo
// queda en la tarjeta y el botón vuelve.
export function useConfirmarTurno(solicitud: string) {
  const router = useRouter()
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [error, setError] = useState<string | null>(null)
  return {
    enCurso,
    error,
    confirmar: async () => {
      setError(null)
      const envio = await mandar(() =>
        enviarAccion(confirmarContacto({ solicitud }), 'No pudimos confirmar el contacto.'),
      )
      if (envio === null) return
      if (envio.ok) {
        router.refresh()
      } else {
        setError(envio.error.mensaje)
      }
    },
  }
}
