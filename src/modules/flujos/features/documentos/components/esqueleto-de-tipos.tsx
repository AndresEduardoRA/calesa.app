import { Skeleton } from '@/shared/ui/skeleton'

function Bloque() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <ul className="grid gap-2">
        {Array.from({ length: 3 }, (_, n) => (
          <li key={n}>
            <Skeleton className="h-14 w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}

// La forma de la pestaña «Documentos»: los dos grupos, cada uno con su encabezado y unas filas.
export function EsqueletoDeTipos() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando los tipos de documento">
      <Bloque />
      <Bloque />
    </div>
  )
}
