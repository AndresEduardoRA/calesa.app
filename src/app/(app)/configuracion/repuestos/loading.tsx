import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/repuestos`: el esqueleto no carga el barril de pantallas.
export default function CargandoConfiguracionDeRepuestos() {
  return <EsqueletoFormulario bloques={4} campos={3} />
}
