import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la pestaña «Documentos» mientras llega la unidad: un tipo y dos filas.
export function EsqueletoDeDocumentos() {
  return (
    <div aria-busy aria-label="Cargando los documentos" className="grid gap-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 rounded-(--radius-card)" />
      <Skeleton className="h-16 rounded-(--radius-card)" />
    </div>
  )
}
