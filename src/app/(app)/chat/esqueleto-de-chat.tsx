import { Skeleton } from '@/shared/ui/skeleton'

// La forma de la pantalla mientras llega: el título y unas filas de conversación; reserva el alto de la lista.
export function EsqueletoDeChat() {
  return (
    <div aria-busy="true" aria-label="Cargando el chat" className="grid gap-3 md:max-w-88">
      <Skeleton className="h-8 w-24" />
      {Array.from({ length: 7 }, (_, fila) => (
        <Skeleton key={fila} className="h-14 w-full md:h-12" />
      ))}
    </div>
  )
}
