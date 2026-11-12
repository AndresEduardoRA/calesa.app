import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega la cadena: las pestañas, la barra de filtros y cuatro columnas con encabezado y tres tarjetas (una sola en el celular). Fijo: no depende de lo que venga.
export function EsqueletoDeTablero() {
  return (
    <div aria-busy="true" aria-label="Cargando la cadena" className="grid gap-4">
      <div className="flex gap-2 border-b border-(--color-line) pb-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-full max-w-sm md:h-9" />
        <Skeleton className="h-11 w-28 md:h-9" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, columna) => (
          <div
            key={columna}
            className={`w-full shrink-0 gap-2 rounded-(--radius-card) bg-(--color-surface-2) p-2 sm:w-72 ${columna > 0 ? 'hidden sm:grid' : 'grid'}`}
          >
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }, (_, tarjeta) => (
              <Skeleton key={tarjeta} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
