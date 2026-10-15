import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el acceso del cliente: el encabezado y la tarjeta con sus datos y botones.
export function EsqueletoDePortal() {
  return (
    <div aria-busy="true" aria-label="Cargando el acceso al portal" className="grid gap-4">
      <div className="grid gap-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
