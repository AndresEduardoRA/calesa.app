import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega una lista: tres recordatorios con la forma real.
export function EsqueletoDeRecordatorios({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      {[0, 1, 2].map((n) => (
        <div key={n} className="grid gap-2 rounded-(--radius-lg) border border-(--color-line) p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  )
}
