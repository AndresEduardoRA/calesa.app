'use client'

import { PlusIcon } from 'lucide-react'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_VEHICULO, PANEL_NUEVO_PROYECTO } from '../../../entities/proyectos/paneles'

// «Nuevo proyecto», que abre el drawer `?panel=nuevo-proyecto`. La tecla N hace lo mismo mientras el botón esté: la página lo dibuja sólo con `repuestos.editar`, así sin ese permiso
// ni el botón ni el atajo existen. Abrir desde el botón borra un `?vehiculo=` que hubiera quedado en la URL.
export function BotonNuevoProyecto() {
  const panel = usePanelPorUrl(PANEL_NUEVO_PROYECTO, [CLAVE_DE_VEHICULO])
  useAtajo('nuevo', () => {
    if (!panel.abierto) {
      panel.abrir()
    }
  })
  return (
    <Button
      className="h-11 md:h-9"
      onClick={() => {
        panel.abrir()
      }}
    >
      <PlusIcon aria-hidden />
      Nuevo proyecto
    </Button>
  )
}
