import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el cuerpo de un widget, sin texto fijo: una cifra y su nota, o (`grafica`) un bloque con el alto de la gráfica
// para que la pantalla no salte al llegar.
export function EsqueletoDeWidget({ alto = 'cifra' }: { alto?: 'cifra' | 'grafica' }) {
  if (alto === 'grafica') {
    return (
      <div aria-hidden className="grid gap-3 p-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  return (
    <div aria-hidden className="grid gap-3 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
