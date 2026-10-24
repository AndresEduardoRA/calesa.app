import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la lista de niveles: el encabezado y cuatro filas con su nombre.
export function EsqueletoDeNiveles() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando los niveles de acceso">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <ul className="grid gap-2">
        {Array.from({ length: 4 }, (_, n) => (
          <li key={n}>
            <Skeleton className="h-14 w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}
