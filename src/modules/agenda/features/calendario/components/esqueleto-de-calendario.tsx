import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega la agenda: el título, la barra y la grilla. Un Server Component que no trae la barra ni las vistas (el esqueleto de una ruta no
// debe sumar sus chunks al JS en frío).
export function EsqueletoDeCalendario() {
  return (
    <div aria-busy="true" aria-label="Cargando la agenda" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-48 max-w-full" />
      </div>
      <Skeleton className="h-8 w-80 max-w-full" />
      <Skeleton className="h-96 rounded-(--radius-card)" />
    </div>
  )
}
