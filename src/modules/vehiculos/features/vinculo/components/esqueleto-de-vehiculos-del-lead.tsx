import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llegan los vehículos del lead: el botón y dos filas con miniatura, con la forma real.
export function EsqueletoDeVehiculosDelLead() {
  return (
    <div aria-hidden className="grid gap-3">
      <Skeleton className="h-11 w-44 md:h-9" />
      {[0, 1].map((n) => (
        <div
          key={n}
          className="flex items-center gap-3 rounded-(--radius-lg) border border-(--color-line) p-3"
        >
          <Skeleton className="aspect-4/3 w-14" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}
