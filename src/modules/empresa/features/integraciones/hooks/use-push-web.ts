'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarPushWeb } from '../actions/guardar-push-web'

// El interruptor de los avisos push. `version` es el `actualizado_en` de su fila.
export function usePushWeb(version: string) {
  const guardando = useAction(guardarPushWeb)
  return {
    cambiarEstado: async (activa: boolean) => {
      const resultado = resultadoDeAccion(
        await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
      )
      if (resultado.ok) {
        avisarExito(activa ? 'Avisos push activados' : 'Avisos push desactivados')
      } else {
        avisarError(resultado.error)
      }
    },
    enCurso: guardando.isPending,
  }
}
