'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { respuestaDe, SIN_SERVIDOR } from '../../fotos/envio'
import { marcarNoGanada } from '../actions/marcar-no-ganada'

export const NO_SE_GUARDO = 'No pudimos guardar el resultado. Intenta de nuevo.'

// «No la ganamos» con «Deshacer» de 10 s, y «Deshacer» de la ficha de una no ganada. Un envío a la vez. Un conflicto (otra persona la resolvió) queda
// con el texto de la base, que nombra a quien; un error, con su texto; sin red, un aviso.
export function useNoGanada({ vehiculoId, origenId }: { vehiculoId: string; origenId: string }) {
  const { executeAsync, isPending } = useAction(marcarNoGanada)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function marcar(noGanada: boolean): Promise<void> {
    if (isPending) return
    setConflicto(null)
    setError(null)
    const hecho = await respuestaDe(executeAsync({ vehiculoId, origenId, noGanada }))
    if (hecho.ok) {
      if (noGanada) {
        avisarConDeshacer(
          'La marcaste como no ganada: ya no cuenta en logística ni en Inicio.',
          () => {
            void marcar(false)
          },
        )
      } else {
        avisarExito('Listo: la subasta vuelve a estar sin resolver.')
      }
      return
    }
    if (hecho.error.codigo === 'conflicto') {
      setConflicto(hecho.error.mensaje)
    } else if (hecho.error.mensaje === SIN_SERVIDOR) {
      avisarError(hecho.error)
    } else if (hecho.error.codigo === 'sin_permiso') {
      setError(hecho.error.mensaje)
    } else {
      setError(NO_SE_GUARDO)
    }
  }

  return { marcar, enviando: isPending, conflicto, error }
}
