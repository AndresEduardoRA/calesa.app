import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/logistica`: el esqueleto no carga el barril de pantallas.
export default function CargandoConfiguracionDeLogistica() {
  return <EsqueletoFormulario bloques={2} campos={4} />
}
