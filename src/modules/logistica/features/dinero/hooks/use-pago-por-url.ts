'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Pago } from '../../../entities/dinero/pago'
import {
  CLAVE_DE_PAGO,
  motivoParaNoAbrirPago,
  pagoDeLaUrl,
} from '../../../entities/dinero/paneles-de-pago'

type Panel = Parameters<typeof motivoParaNoAbrirPago>[0]['panel']
type Permisos = { puedeEditar: boolean | null; puedeConfirmar: boolean | null }

// Lo común de los diálogos de un pago por URL (`?panel=<panel>&pago=<id>`): se puede recargar y «atrás» los cierra. Un pago que no está, que no está en el estado que pide el panel o sin el
// permiso no abre: se avisa y la URL se limpia, una vez, con la lista ya leída. Mientras se va, el diálogo conserva el último pago que vio.
export function usePagoPorUrl(panel: Panel, pagos: readonly Pago[] | null, permisos: Permisos) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_PAGO])
  const id = url.valor(CLAVE_DE_PAGO)
  const apertura = useApertura(url.abierto)
  const encontrado = pagoDeLaUrl(pagos, id)
  const revisar = url.abierto && pagos !== null && permisos.puedeEditar !== null
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar ? motivoParaNoAbrirPago({ panel, valor: id, encontrado, permisos }) : null,
    url.cerrar,
  )
  const pago = useUltimo(revisar && !rechazada ? encontrado : null)
  return {
    abierto: revisar && !rechazada,
    apertura,
    pago,
    abrir: (pagoId: string) => {
      url.abrir({ [CLAVE_DE_PAGO]: pagoId })
    },
    cerrar: url.cerrar,
  }
}
