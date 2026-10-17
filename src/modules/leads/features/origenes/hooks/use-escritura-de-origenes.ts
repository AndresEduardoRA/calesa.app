'use client'

import { useRouter } from 'next/navigation'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { OrigenDeLeadConUso, RespuestaDeOrigenes } from '../../../entities/origen-de-lead'

export type EnvioDeOrigenes = Envio<RespuestaDeOrigenes>

// Lo común a las cuatro escrituras: un pedido a la vez (con una marca propia, no `isPending`: un Enter
// repetido sobre «Subir» llega antes de que el estado cambie), y la lista de la respuesta reemplaza a la
// local. `mandar` devuelve nulo si ya había uno en vuelo.
export function useEscrituraDeOrigenes(poner: (origenes: readonly OrigenDeLeadConUso[]) => void) {
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()

  function mandar(pedido: () => Promise<EnvioDeOrigenes>): Promise<EnvioDeOrigenes | null> {
    return unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) {
        poner(envio.data.origenes)
      }
      return envio
    })
  }

  // Un rechazo que no es del campo: se dice, y si la causa es que otra persona cambió la lista (o ya
  // no se tiene el permiso), la página se vuelve a leer.
  function rechazar(envio: EnvioDeOrigenes) {
    if (envio.ok) {
      return
    }
    avisarError(envio.error)
    if (envio.error.codigo === 'conflicto' || envio.error.codigo === 'sin_permiso') {
      router.refresh()
    }
  }

  return { mandar, rechazar, enCurso: unaVez.enCurso, releer: () => void router.refresh() }
}

export type EscrituraDeOrigenes = ReturnType<typeof useEscrituraDeOrigenes>
