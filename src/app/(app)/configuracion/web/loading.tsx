import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas.
export default function CargandoConfiguracionDeWeb() {
  return <EsqueletoFormulario bloques={2} campos={4} />
}
