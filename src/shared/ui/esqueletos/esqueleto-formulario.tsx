import { Skeleton } from '../skeleton'

type Props = { bloques?: number; campos?: number }

// Patrón «formulario en bloques»: cada bloque con su título y sus campos.
export function EsqueletoFormulario({ bloques = 2, campos = 3 }: Props) {
  return (
    <div aria-busy="true" aria-label="Cargando el formulario" className="grid max-w-2xl gap-4">
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: bloques }, (_, bloque) => (
        <div
          key={bloque}
          className="grid gap-4 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
        >
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: campos }, (_, campo) => (
            <div key={campo} className="grid gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
