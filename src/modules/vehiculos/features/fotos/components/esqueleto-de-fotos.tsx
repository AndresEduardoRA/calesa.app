import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la pestaña «Fotos» mientras llegan: la zona para elegir y la grilla.
export function EsqueletoDeFotos() {
  return (
    <div aria-busy className="grid gap-4">
      <Skeleton className="h-28 rounded-(--radius-card)" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <Skeleton key={indice} className="aspect-4/3 rounded-(--radius-card)" />
        ))}
      </div>
    </div>
  )
}
