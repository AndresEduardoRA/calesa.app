'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { rutaDeGuia } from '../../../../entities/contenido/guias'
import { FormularioDeNuevaGuia } from './formulario-de-nueva-guia'

export const PANEL_DE_NUEVA_GUIA = 'guia-nueva'

// «Nueva guía»: el botón y su panel (`?panel=guia-nueva`). Crear el borrador lleva a la página de la guía, donde se escribe.
export function DrawerNuevaGuia() {
  const router = useRouter()
  const panel = usePanelPorUrl(PANEL_DE_NUEVA_GUIA)
  return (
    <>
      <Button
        type="button"
        className="h-11 md:h-9"
        onClick={() => {
          panel.abrir()
        }}
      >
        <PlusIcon aria-hidden className="size-4" />
        Nueva guía
      </Button>
      <Drawer abierto={panel.abierto} alCerrar={panel.cerrar} titulo="Nueva guía">
        {panel.abierto ? (
          <FormularioDeNuevaGuia
            alCrear={(id) => {
              router.push(rutaDeGuia(id) as Route)
            }}
            alCancelar={panel.cerrar}
          />
        ) : null}
      </Drawer>
    </>
  )
}
