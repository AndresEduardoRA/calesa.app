import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el kanban: la barra, el aviso y cuatro columnas con tarjetas (una en el celular).
export function EsqueletoDeTablero() {
  return (
    <div aria-busy="true" aria-label="Cargando el embudo" className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-40 md:h-9" />
        <Skeleton className="h-11 w-36 md:h-9" />
        <Skeleton className="ml-auto h-11 w-28 md:h-9" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, columna) => (
          <div
            key={columna}
            className={`w-full shrink-0 gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2 sm:w-72 ${columna > 0 ? 'hidden sm:grid' : 'grid'}`}
          >
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 - (columna % 2) }, (_, tarjeta) => (
              <Skeleton key={tarjeta} className="h-28 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
