'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { reportar } from '../actions/reportar'
import { retirarReporte } from '../actions/retirar-reporte'

const NO_SE_ENVIO = 'No se pudo enviar el reporte.'
const NO_SE_RETIRO = 'No se pudo retirar el reporte.'

// «Retirar mi reporte» (4.27-4): es reversible, así que se hace sin preguntar y el aviso ofrece «Deshacer», que vuelve a reportar con el motivo que tenía. Al entrar
// cierra el modal y vuelve a leer la página (el botón dice otra vez «Reportar…»).
export function useRetiroDelReporte(cotizacionId: string, alCerrar: () => void) {
  const router = useRouter()
  const [retirando, setRetirando] = useState(false)

  function deshacer(motivo: string) {
    void enviarAccion(reportar({ cotizacionId, motivo }), NO_SE_ENVIO).then((otra) => {
      if (otra.ok) {
        avisarExito('Reporte enviado.')
        router.refresh()
      } else {
        avisarError(otra.error)
      }
    })
  }

  async function retirar(motivo: string) {
    setRetirando(true)
    const resultado = await enviarAccion(retirarReporte({ cotizacionId }), NO_SE_RETIRO)
    setRetirando(false)
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    alCerrar()
    router.refresh()
    avisarConDeshacer('Reporte retirado.', () => {
      deshacer(motivo)
    })
  }

  return { retirando, retirar }
}
