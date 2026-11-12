'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Gasto } from '../../../entities/dinero/gasto'
import {
  CLAVE_DE_GASTO,
  gastoDeLaUrl,
  motivoParaNoAbrirGasto,
  PANEL_ELIMINAR_GASTO,
} from '../../../entities/dinero/paneles'

// La confirmación de eliminar un gasto en la URL (`?panel=eliminar-gasto&gasto=<id>`): se puede recargar y «atrás» la cierra. Un gasto que no está (o sin permiso de editar) no abre: se avisa y la URL se
// limpia, una vez, con la lista ya leída. Mientras se va, el diálogo conserva el último que vio.
export function useEliminarGastoPorUrl(
  gastos: readonly Gasto[] | null,
  puedeEditar: boolean | null,
) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_GASTO, [CLAVE_DE_GASTO])
  const id = url.valor(CLAVE_DE_GASTO)
  const apertura = useApertura(url.abierto)
  const encontrado = gastoDeLaUrl(gastos, id)
  const revisar = url.abierto && gastos !== null && puedeEditar !== null
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar
      ? motivoParaNoAbrirGasto({ valor: id, encontrado, puedeEditar, admiteNuevo: false })
      : null,
    url.cerrar,
  )
  const gasto = useUltimo(revisar && !rechazada ? encontrado : null)
  return {
    abierto: revisar && !rechazada,
    gasto,
    abrir: (gastoId: string) => {
      url.abrir({ [CLAVE_DE_GASTO]: gastoId })
    },
    cerrar: url.cerrar,
  }
}
