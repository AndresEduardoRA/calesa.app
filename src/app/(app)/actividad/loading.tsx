import { EsqueletoListado } from '@/shared/ui/esqueletos'

// Sólo el esqueleto: importar la pantalla aquí bajaría su chunk dos veces en frío.
export default function CargandoActividad() {
  return <EsqueletoListado filas={8} columnas={5} />
}
