import { Skeleton } from '@/shared/ui/skeleton'

// La forma del formulario mientras llegan los ajustes de la empresa y los parámetros de la URL.
export function EsqueletoAcceso({ campos }: { campos: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-4">
      {Array.from({ length: campos }, (_, campo) => (
        <div key={campo} className="grid gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 w-full md:h-9" />
        </div>
      ))}
      <Skeleton className="h-11 w-full md:h-9" />
    </div>
  )
}

export function TituloAcceso({ titulo, bajada }: { titulo: string; bajada?: string }) {
  return (
    <header className="grid gap-1">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">{titulo}</h1>
      {bajada ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{bajada}</p> : null}
    </header>
  )
}
