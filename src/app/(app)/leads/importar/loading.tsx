import { EsqueletoFormulario, EsqueletoTabla } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// Repite la forma de la página (el título y los dos `<Suspense>`), para que al pasar de este esqueleto al de la página nada salte.
// Sin importar `@/modules/leads`: el esqueleto no carga el barril de pantallas.
export default function CargandoImportarLeads() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-7 w-48" />
      <EsqueletoFormulario bloques={1} campos={3} />
      <EsqueletoTabla filas={2} columnas={3} />
    </div>
  )
}
