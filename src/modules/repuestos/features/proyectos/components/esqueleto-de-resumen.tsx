import { Skeleton } from '@/shared/ui/skeleton'

// La forma del resumen de repuestos mientras llega (8.09-4, C5): el número, el estado y una fila de fases.
export function EsqueletoDeResumen() {
  return (
    <div
      aria-busy
      aria-label="Cargando los repuestos"
      className="grid gap-3 rounded-(--radius-card) border border-(--color-border) p-4"
    >
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-64 max-w-full" />
    </div>
  )
}
