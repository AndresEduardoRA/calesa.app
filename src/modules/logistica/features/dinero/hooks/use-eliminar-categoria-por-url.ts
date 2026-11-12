'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'
import {
  CLAVE_DE_CATEGORIA,
  MENSAJE_CATEGORIA_YA_NO_ESTA,
  PANEL_ELIMINAR_CATEGORIA,
} from '../../../entities/dinero/paneles'

// La confirmación de eliminar una categoría en la URL (`?panel=eliminar-categoria&categoria=<id>`): se puede recargar y «atrás» la cierra. Una que ya no está no abre (se avisa y la URL se
// limpia, una vez, con la lista ya leída); mientras se va, el diálogo conserva la última que vio.
export function useEliminarCategoriaPorUrl(categorias: readonly CategoriaDeGasto[] | null) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_CATEGORIA, [CLAVE_DE_CATEGORIA])
  const id = url.valor(CLAVE_DE_CATEGORIA)
  const apertura = useApertura(url.abierto)
  const encontrada = categorias?.find((c) => c.id === id) ?? null
  const revisar = url.abierto && categorias !== null
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar && encontrada === null ? MENSAJE_CATEGORIA_YA_NO_ESTA : null,
    url.cerrar,
  )
  const categoria = useUltimo(revisar && !rechazada ? encontrada : null)
  return {
    abierto: revisar && !rechazada && encontrada !== null,
    categoria,
    abrir: (categoriaId: string) => {
      url.abrir({ [CLAVE_DE_CATEGORIA]: categoriaId })
    },
    cerrar: url.cerrar,
  }
}
