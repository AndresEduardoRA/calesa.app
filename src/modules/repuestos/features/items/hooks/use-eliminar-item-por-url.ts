'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_ITEM,
  MENSAJE_ITEM_YA_NO_ESTA,
  PANEL_ELIMINAR_ITEM,
} from '../../../entities/items/paneles'
import type { FilaDeItem } from '../../../entities/nucleo/item'

// La confirmación de eliminar un ítem en la URL (`?panel=eliminar-item&item=<id>`, 8.09-2, C11): se puede recargar y «atrás» la cierra. Uno que ya no está (o que no se ve) no abre: se avisa y la
// URL se limpia, una vez; mientras se va, el diálogo conserva el último que vio. Sin `repuestos.editar` o con el proyecto cerrado no se pasa ningún ítem: nunca abre.
export function useEliminarItemPorUrl(filas: readonly FilaDeItem[], puedeEditar: boolean) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_ITEM, [CLAVE_DE_ITEM])
  const id = url.valor(CLAVE_DE_ITEM)
  const apertura = useApertura(url.abierto)
  const encontrado = puedeEditar ? (filas.find((f) => f.id === id) ?? null) : null
  const rechazado = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && encontrado === null ? MENSAJE_ITEM_YA_NO_ESTA : null,
    url.cerrar,
  )
  const item = useUltimo(url.abierto && !rechazado ? encontrado : null)
  return {
    abierto: url.abierto && !rechazado && encontrado !== null,
    item,
    abrir: (itemId: string) => {
      url.abrir({ [CLAVE_DE_ITEM]: itemId })
    },
    cerrar: url.cerrar,
  }
}
