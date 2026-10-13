import { Skeleton } from '../skeleton'

type Props = {
  // Cuántas pestañas se esperan arriba (0 = el listado no tiene).
  pestanas?: number
  filas?: number
  columnas?: number
  // La fila lleva una miniatura adelante.
  conMiniatura?: boolean
}

// Patrón «tabla + panel de filtros»: pestañas, barra con búsqueda y «Filtros», el panel al
// costado en escritorio y las filas de la altura de la densidad. Es la forma de `<FilterShell>`.
export function EsqueletoListado({
  pestanas = 0,
  filas = 8,
  columnas = 5,
  conMiniatura = false,
}: Props) {
  return (
    <div aria-busy="true" aria-label="Cargando la lista" className="grid gap-3">
      {pestanas > 0 ? (
        <div className="flex gap-2 border-b border-(--color-line) pb-2">
          {Array.from({ length: pestanas }, (_, pestana) => (
            <Skeleton key={pestana} className="h-8 w-28" />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-full max-w-sm md:h-9" />
        <Skeleton className="h-11 w-24 md:h-9" />
        <Skeleton className="ml-auto h-11 w-32 md:h-9" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden gap-4 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 lg:grid">
          {Array.from({ length: 5 }, (_, filtro) => (
            <div key={filtro} className="grid gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
          {Array.from({ length: filas + 1 }, (_, fila) => (
            <div
              key={fila}
              className="flex min-h-(--fila) items-center gap-4 border-b border-(--color-line) px-4 py-1.5 last:border-b-0"
            >
              {conMiniatura ? (
                <Skeleton className="aspect-4/3 w-14 shrink-0 rounded-(--radius-sm)" />
              ) : null}
              {Array.from({ length: columnas }, (_, columna) => (
                <Skeleton key={columna} className="h-3.5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
