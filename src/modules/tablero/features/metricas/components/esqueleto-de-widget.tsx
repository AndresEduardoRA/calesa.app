import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el cuerpo de un widget: una cifra y su nota, sin texto fijo.
export function EsqueletoDeWidget() {
  return (
    <div aria-hidden className="grid gap-3 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
