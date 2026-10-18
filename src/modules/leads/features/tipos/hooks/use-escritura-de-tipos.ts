'use client'

import { useRouter } from 'next/navigation'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { ListaDeTipos, RespuestaDeTipos } from '../../../entities/tipo-de-lead'

export type EnvioDeTipos = Envio<RespuestaDeTipos>

const REFRESCAN = new Set(['conflicto', 'sin_permiso', 'regla'])

// Lo común a las cuatro escrituras: un pedido a la vez (con una marca propia, no `isPending`: un Enter
// repetido sobre «Subir» llega antes de que el estado cambie), y la lista de la respuesta reemplaza a la
// local. `mandar` devuelve nulo si ya había uno en vuelo.
export function useEscrituraDeTipos(poner: (lista: ListaDeTipos) => void) {
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()

  function mandar(pedido: () => Promise<EnvioDeTipos>): Promise<EnvioDeTipos | null> {
    return unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) {
        poner(envio.data.lista)
      }
      return envio
    })
  }

  // Un rechazo que no es del campo: se dice, y si la causa es que otra persona cambió la lista (o ya no se tiene el permiso, o
  // una regla que depende de los otros tipos —«siempre uno activo de cada clase»— ya no se cumple con lo que se ve), la página se
  // vuelve a leer.
  function rechazar(envio: EnvioDeTipos) {
    if (envio.ok) {
      return
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) {
      router.refresh()
    }
  }

  return { mandar, rechazar, enCurso: unaVez.enCurso, releer: () => void router.refresh() }
}

export type EscrituraDeTipos = ReturnType<typeof useEscrituraDeTipos>
