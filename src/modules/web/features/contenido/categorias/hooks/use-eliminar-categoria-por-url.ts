'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { CategoriaDeGuia } from '../../../../entities/contenido/categorias'

// `?eliminar=categoria&categoria=<id>`: el diálogo de «Eliminar categoría» vive en su propia clave y deja `?panel=categorias` como está.
export const PANEL_ELIMINAR_CATEGORIA = 'categoria'

export function useEliminarCategoriaPorUrl(filas: readonly CategoriaDeGuia[]) {
  const panel = usePanelPorUrl(PANEL_ELIMINAR_CATEGORIA, ['categoria'], { clave: 'eliminar' })
  const id = panel.valor('categoria')
  const categoria = filas.find((fila) => fila.id === id) ?? null
  return {
    abierto: panel.abierto && categoria !== null,
    // La URL pide eliminar una que ya no está (otra persona la quitó, o un enlace viejo).
    ausente: panel.abierto && categoria === null,
    categoria,
    abrir: (idDeCategoria: string) => {
      panel.abrir({ categoria: idDeCategoria })
    },
    cerrar: panel.cerrar,
  }
}
