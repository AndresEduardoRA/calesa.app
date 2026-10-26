import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la hoja mientras se lee: las pestañas, dos secciones con sus celdas y el resumen.
export function EsqueletoDeHoja() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Cargando la hoja de cotizar">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-11 w-full max-w-md" />
      {Array.from({ length: 2 }, (_, seccion) => (
        <div
          key={seccion}
          className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
        >
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, celda) => (
              <Skeleton key={celda} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ))}
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
