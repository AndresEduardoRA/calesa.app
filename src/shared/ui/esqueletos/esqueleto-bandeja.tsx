import { Skeleton } from '../skeleton'

type Props = { bloques?: number }

// Patrón «bandeja»: saludo y una grilla de bloques con su contador.
export function EsqueletoBandeja({ bloques = 6 }: Props) {
  return (
    <div aria-busy="true" aria-label="Cargando la bandeja" className="grid gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: bloques }, (_, bloque) => (
          <Skeleton key={bloque} className="h-36 rounded-(--radius-card)" />
        ))}
      </div>
    </div>
  )
}
