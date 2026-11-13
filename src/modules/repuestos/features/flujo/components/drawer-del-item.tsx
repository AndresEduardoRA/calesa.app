'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { useItemPorUrl } from '../hooks/use-item-por-url'

// El panel de un ítem de repuestos sobre la hoja (8.13-2, D2): `?item=<id>` sin `?panel=`. Es el marco: lo de adentro (`<ItemAbierto>`, que lee el ítem) llega de la página como hijo,
// porque lee la base. Cerrar suelta `?item=` y vuelve a pedir la página (`shallow: false`), así el panel no queda montado con un ítem que ya no se muestra. El panel sólo muestra: lo que se
// escribe adentro (la nota, el motivo de mover) va en sus huecos, que preguntan por sí solos (`scripts/guardas/areas-c/drawers-con-salida.ts`).
export function DrawerDelItem({ children }: { children: ReactNode }) {
  const { abierto, cerrar } = useItemPorUrl()
  return (
    <Drawer
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Repuesto"
      descripcion="El ítem y lo que falta o se hizo en su recorrido."
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
