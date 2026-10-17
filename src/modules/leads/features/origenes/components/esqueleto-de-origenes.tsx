import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la lista de orígenes del lead: seis filas con su nombre y sus botones.
export function EsqueletoDeOrigenes() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando los orígenes del lead">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <ul className="grid gap-2">
        {Array.from({ length: 6 }, (_, n) => (
          <li key={n}>
            <Skeleton className="h-14 w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}
