'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Skeleton } from '@/shared/ui/skeleton'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'

type Props = {
  // La lectura falló: lo dice y ofrece «Reintentar», sin cerrar el drawer.
  fallo?: boolean
  alReintentar?: () => void
}

// «Nuevo lead» mientras lee lo que necesita (`infra/contexto-de-alta.client.ts`) o si no pudo: el drawer ya abierto, con la forma del
// formulario y, si falla, el motivo y «Reintentar». También es lo que se ve mientras llega el código del formulario. No guarda nada
// tipeado (todavía no hay formulario): cerrarlo no pregunta.
export function EsperaDelAlta({ fallo = false, alReintentar }: Props) {
  const panel = usePanelDeAlta()
  return (
    <Drawer
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo="Nuevo lead"
      descripcion="Datos del lead"
      ancho="amplio"
    >
      {fallo ? (
        <div role="alert" className="grid gap-3">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudo cargar el formulario.
          </p>
          <Button type="button" variant="outline" onClick={alReintentar} className="w-fit">
            Reintentar
          </Button>
        </div>
      ) : (
        <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
    </Drawer>
  )
}
