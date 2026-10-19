'use client'

import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { EnElMarco } from './marco-del-alta'

type Props = {
  // La lectura falló: lo dice y ofrece «Reintentar», sin cerrar el drawer.
  fallo?: boolean
  alReintentar?: () => void
}

// El cuerpo de «Nuevo lead» mientras lee lo que necesita (`infra/contexto-de-alta.client.ts`) o si no pudo: la forma del formulario y, si
// falla, el motivo y «Reintentar». También es lo que se ve mientras llega el código del formulario. No es un drawer: se dibuja en el
// cuerpo del único drawer del alta (`marco-del-alta.tsx`), así que cuando llega el formulario el drawer no se vuelve a montar ni a animar.
// No guarda nada tipeado (todavía no hay formulario): cerrarlo no pregunta.
export function EsperaDelAlta({ fallo = false, alReintentar }: Props) {
  return (
    <EnElMarco donde="cuerpo">
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
    </EnElMarco>
  )
}
