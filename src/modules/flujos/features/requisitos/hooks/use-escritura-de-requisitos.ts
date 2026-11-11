'use client'

import { useRouter } from 'next/navigation'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'

const REFRESCAN = new Set(['sin_permiso', 'regla', 'no_encontrado'])

// Lo común a las escrituras de requisitos: un pedido a la vez (con una marca propia, no `isPending`: un Enter repetido llega antes de que el estado cambie).
// `mandar` devuelve nulo si ya había uno en vuelo. La lista no viene en la respuesta: la action revalida la pantalla y la página trae el flujo nuevo, con su
// versión. Un conflicto (`PT409`) lo dice el aviso de arriba del flujo (`avisarConflicto`), que espera la versión nueva; lo demás es un aviso.
export function useEscrituraDeRequisitos() {
  const router = useRouter()
  const { avisarConflicto } = useVersionDelFlujo()
  const unaVez = useUnEnvioALaVez()

  function rechazar<T>(envio: Envio<T>) {
    if (envio.ok) {
      return
    }
    if (envio.error.codigo === 'conflicto') {
      avisarConflicto(envio.error.mensaje)
      return
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) {
      router.refresh()
    }
  }

  return {
    mandar: unaVez.mandar,
    rechazar,
    enCurso: unaVez.enCurso,
    releer: () => void router.refresh(),
  }
}
