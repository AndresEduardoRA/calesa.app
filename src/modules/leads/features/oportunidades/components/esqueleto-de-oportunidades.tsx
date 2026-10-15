import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llegan las oportunidades del lead: el encabezado con su botón y tres tarjetas.
export function EsqueletoDeOportunidades() {
  return (
    <div aria-busy="true" aria-label="Cargando las oportunidades" className="grid gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-40 md:h-8" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}
