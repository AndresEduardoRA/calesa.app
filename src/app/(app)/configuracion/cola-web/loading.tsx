import { EsqueletoListado } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas.
export default function CargandoColaWeb() {
  return <EsqueletoListado filas={6} columnas={3} />
}
