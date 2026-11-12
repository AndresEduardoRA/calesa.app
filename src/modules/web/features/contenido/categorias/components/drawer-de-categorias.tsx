'use client'

import { TagsIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ListaDeCategorias } from '../../../../entities/contenido/categorias'
import { CuerpoDeCategorias } from './diferidos'

export const PANEL_DE_CATEGORIAS = 'categorias'

// «Categorías»: el botón y su panel (`?panel=categorias`). El cuerpo (formulario, lista y diálogo de eliminar) se monta al abrir por primera vez.
export function DrawerDeCategorias({ lista }: { lista: ListaDeCategorias }) {
  const panel = usePanelPorUrl(PANEL_DE_CATEGORIAS)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => {
          panel.abrir()
        }}
      >
        <TagsIcon aria-hidden className="size-4" />
        Categorías
      </Button>
      <Drawer
        abierto={panel.abierto}
        alCerrar={panel.cerrar}
        titulo="Categorías de las guías"
        descripcion="Cada guía se ordena en una. Desactivar una la esconde al elegir categoría; no cambia lo ya publicado."
        pie={
          <Button type="button" className="min-h-11 md:min-h-9" onClick={panel.cerrar}>
            Listo
          </Button>
        }
      >
        {montar ? <CuerpoDeCategorias lista={lista} /> : null}
      </Drawer>
    </>
  )
}
