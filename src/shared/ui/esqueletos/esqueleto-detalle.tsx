import { Skeleton } from '../skeleton'

// Patrón «detalle con pestañas»: título, pestañas y dos columnas de contenido.
export function EsqueletoDetalle() {
  return (
    <div aria-busy="true" aria-label="Cargando la ficha" className="grid gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, pestana) => (
          <Skeleton key={pestana} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-64 rounded-(--radius-card) md:col-span-2" />
        <Skeleton className="h-64 rounded-(--radius-card)" />
      </div>
    </div>
  )
}
