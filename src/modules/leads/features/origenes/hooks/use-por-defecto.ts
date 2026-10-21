'use client'

import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { OrigenDeLeadConUso } from '../../../entities/origen-de-lead'
import type { EscrituraDeOrigenes } from './use-escritura-de-origenes'
import type { usePedidosDeOrigenes } from './use-pedidos-de-origenes'

// El origen «por defecto» de la empresa: el que el alta propone a quien no tiene un último origen activo. Marcar uno desmarca al anterior (la
// base lo hace y la lista vuelve entera); marcar no mueve la versión. Es reversible: «Deshacer» devuelve la marca a quien la tenía.
export function usePorDefecto(
  origenes: readonly OrigenDeLeadConUso[],
  escritura: EscrituraDeOrigenes,
  pedir: ReturnType<typeof usePedidosDeOrigenes>,
) {
  async function marcar(origen: OrigenDeLeadConUso, valor: boolean) {
    const anterior = origenes.find((uno) => uno.porDefecto && uno.id !== origen.id)
    const envio = await escritura.mandar(() => pedir.guardar(origen, { porDefecto: valor }))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    const quedo = envio.data.origenes.find((uno) => uno.id === origen.id)
    const anteriorQuedo = envio.data.origenes.find((uno) => uno.id === anterior?.id)
    if (quedo) {
      const dicho = valor
        ? `«${origen.nombre}» es ahora el origen por defecto.`
        : `«${origen.nombre}» ya no es el origen por defecto.`
      avisarConDeshacer(dicho, () => {
        if (valor && anteriorQuedo) {
          void marcar(anteriorQuedo, true)
        } else {
          void marcar(quedo, !valor)
        }
      })
    }
  }
  return { marcar }
}
