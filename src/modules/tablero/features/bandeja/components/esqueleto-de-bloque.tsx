import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el cuerpo de un bloque: tres filas, sin texto fijo.
export function EsqueletoDeBloque() {
  return (
    <div aria-hidden className="grid gap-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
