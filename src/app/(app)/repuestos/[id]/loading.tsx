import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

export default function CargandoUnProyecto() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-16 w-full max-w-xl" />
      <EsqueletoListado filas={6} columnas={6} />
    </div>
  )
}
