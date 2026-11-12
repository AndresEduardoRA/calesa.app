import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la pantalla mientras llega: las dos pestañas y unas filas de aviso.
export function EsqueletoDeNotificaciones() {
  return (
    <div aria-busy="true" aria-label="Cargando las notificaciones" className="grid gap-4">
      <Skeleton className="h-9 w-56 max-w-full" />
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, fila) => (
          <Skeleton key={fila} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
