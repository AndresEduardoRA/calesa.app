'use client'

import { useRouter } from 'next/navigation'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'

const REFRESCAN = new Set(['sin_permiso', 'regla'])

// Lo común a las escrituras de fases: un pedido a la vez (con una marca propia, no `isPending`: un Enter repetido sobre «Subir» llega antes de que el
// estado cambie). `mandar` devuelve nulo si ya había uno en vuelo. La lista no viene en la respuesta (ninguna RPC la devuelve): la action revalida la
// pantalla y la página trae la lista nueva. Un conflicto (`PT409`) lo dice el aviso de arriba del flujo (`avisarConflicto`), con «Recargar».
export function useEscrituraDeFases() {
  const router = useRouter()
  const { avisarConflicto } = useVersionDelFlujo()
  const unaVez = useUnEnvioALaVez()

  // Un rechazo que no es del campo: se dice y, si la causa es que otra persona cambió el flujo o ya no se tiene el permiso, la página se vuelve a leer.
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

  return { mandar: unaVez.mandar, rechazar, enCurso: unaVez.enCurso }
}
