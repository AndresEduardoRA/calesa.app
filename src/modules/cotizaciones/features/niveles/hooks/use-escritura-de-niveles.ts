'use client'

import { useRouter } from 'next/navigation'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { ListaDeNiveles, RespuestaDeNiveles } from '../../../entities/nivel'

export type EnvioDeNiveles = Envio<RespuestaDeNiveles>

// Un conflicto, un permiso que se perdió o una regla que ya no se cumple con lo que se ve (un nivel que otra persona puso en uso mientras se
// confirmaba eliminarlo): la página se vuelve a leer.
const REFRESCAN = new Set(['conflicto', 'sin_permiso', 'regla'])

// Lo común a las cinco escrituras: un pedido a la vez (con una marca propia, no `isPending`: un Enter repetido llega antes de que el estado
// cambie), y la lista de la respuesta reemplaza a la local. `mandar` devuelve nulo si ya había uno en vuelo.
export function useEscrituraDeNiveles(poner: (lista: ListaDeNiveles) => void) {
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()

  function mandar(pedido: () => Promise<EnvioDeNiveles>): Promise<EnvioDeNiveles | null> {
    return unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) {
        poner(envio.data.lista)
      }
      return envio
    })
  }

  // Un rechazo que no es del campo: se dice (el motivo real, tal cual lo da la base) y, si lo causó que otra persona cambió la lista, la
  // página se vuelve a leer.
  function rechazar(envio: EnvioDeNiveles) {
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

export type EscrituraDeNiveles = ReturnType<typeof useEscrituraDeNiveles>
