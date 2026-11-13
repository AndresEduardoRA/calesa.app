import { Suspense } from 'react'
import { DrawerDelItem } from '@/modules/repuestos/pantallas/flujo'
import type { Permisos } from '@/shared/lib/permisos'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { ItemAbierto } from './item-abierto'

// El panel del ítem de `?item=<id>` (8.13-2): lo montan la hoja de un proyecto y la Cadena (8.13-3). Sólo se abre sin `?panel=`. Una URL con el id de otro proyecto abre igual (se lee por id,
// bajo la RLS). Nulo sin `itemId`.
export function PanelDelItem({ itemId, permisos }: { itemId: string | null; permisos: Permisos }) {
  if (itemId === null) return null
  return (
    <DrawerDelItem>
      <Suspense fallback={<EsqueletoListado filas={4} columnas={2} />}>
        <ItemAbierto id={itemId} permisos={permisos} />
      </Suspense>
    </DrawerDelItem>
  )
}
