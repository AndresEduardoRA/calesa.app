import { Skeleton } from '../skeleton'

type Props = { filas?: number; columnas?: number }

// Patrón «tabla + drawer»: barra de filtros, encabezado y filas de la altura de la densidad.
export function EsqueletoTabla({ filas = 8, columnas = 5 }: Props) {
  return (
    <div aria-busy="true" aria-label="Cargando la lista" className="grid gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {Array.from({ length: filas + 1 }, (_, fila) => (
          <div
            key={fila}
            className="flex h-(--fila) items-center gap-4 border-b border-(--color-line) px-4 last:border-b-0"
          >
            {Array.from({ length: columnas }, (_, columna) => (
              <Skeleton key={columna} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
