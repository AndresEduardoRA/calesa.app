import { EsqueletoListado } from '@/shared/ui/esqueletos'

// Repite el `<Suspense>` de la página: la hoja de una cotización no lleva la cabecera del proyecto, así que no hereda la de `repuestos/[id]`.
export default function CargandoUnaCotizacionDeRepuestos() {
  return <EsqueletoListado filas={6} columnas={6} />
}
