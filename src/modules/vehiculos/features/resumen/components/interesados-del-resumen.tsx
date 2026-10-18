'use client'

import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerRelacionesDelResumen } from '../../../composicion.client'
import { VinculoEInteresados } from '../../vinculo/components/vinculo-e-interesados'

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando los interesados" className="grid gap-2">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

// «Interesados» del resumen: el vínculo con su historial y quiénes mostraron interés, lo mismo que debajo de la ficha. Se lee al elegir
// la pestaña (dos RPC a la vez, con la RLS de quien mira: el nombre de un lead sólo llega si lo ve). Vincular, desvincular y marcar
// interés son de la ficha del lead y de la del vehículo.
export function InteresadosDelResumen({ vehiculoId }: { vehiculoId: string }) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerRelacionesDelResumen(vehiculoId),
    vehiculoId,
  )
  if (lectura.estado === 'leyendo') {
    return <Esqueleto />
  }
  if (lectura.estado === 'fallo') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los interesados.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  return <VinculoEInteresados relaciones={lectura.dato} />
}
