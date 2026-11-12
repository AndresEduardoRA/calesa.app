'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_ITEM,
  MENSAJE_ITEM_YA_NO_ESTA,
  PANEL_IMAGENES,
} from '../../../entities/items/paneles'
import type { FilaDeItem } from '../../../entities/nucleo/item'

// El panel de imágenes en la URL (`?panel=imagenes&item=<id>`, 8.09-3, C11): se puede recargar y «atrás» lo cierra. Lo abre también quien sólo puede ver (el panel queda de lectura). Un ítem que ya no
// está en la hoja no abre: se avisa y la URL se limpia, una vez; mientras se va, el panel conserva el último que vio. `apertura` remonta el contenido en cada apertura.
export function useImagenesPorUrl(filas: readonly FilaDeItem[]) {
  const url = usePanelPorUrl(PANEL_IMAGENES, [CLAVE_DE_ITEM])
  const id = url.valor(CLAVE_DE_ITEM)
  const apertura = useApertura(url.abierto)
  const encontrado = filas.find((f) => f.id === id) ?? null
  const rechazado = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && encontrado === null ? MENSAJE_ITEM_YA_NO_ESTA : null,
    url.cerrar,
  )
  const item = useUltimo(url.abierto && !rechazado ? encontrado : null)
  return {
    abierto: url.abierto && !rechazado && encontrado !== null,
    item,
    apertura,
    abrir: (itemId: string) => {
      url.abrir({ [CLAVE_DE_ITEM]: itemId })
    },
    cerrar: url.cerrar,
  }
}
