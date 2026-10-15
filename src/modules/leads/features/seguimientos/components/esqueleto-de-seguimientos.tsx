import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega la línea de tiempo: el botón y tres seguimientos con la forma real.
export function EsqueletoDeSeguimientos() {
  return (
    <div aria-hidden className="grid gap-3">
      <Skeleton className="h-11 w-44 md:h-9" />
      {[0, 1, 2].map((n) => (
        <div key={n} className="grid gap-2 rounded-(--radius-lg) border border-(--color-line) p-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  )
}
