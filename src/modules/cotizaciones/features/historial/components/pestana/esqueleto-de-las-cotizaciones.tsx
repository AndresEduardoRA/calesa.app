import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega el código de la pestaña «Cotizaciones»: las tres filas de la lista. Aparte del componente para que `diferidos.tsx` no lo arrastre a la carga en frío.
export function EsqueletoDeLasCotizaciones() {
  return (
    <div aria-busy="true" aria-label="Cargando las cotizaciones" className="grid gap-2">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  )
}
