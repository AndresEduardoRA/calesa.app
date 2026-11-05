import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega el código del historial: el alto del botón plegado. Aparte del componente para que `diferidos.tsx` no lo arrastre a la carga en frío.
export function EsqueletoDelHistorial() {
  return <Skeleton className="h-11 md:h-9" />
}
