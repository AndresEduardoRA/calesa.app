import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/flujos`: el esqueleto no carga el barril de pantallas.
export default function CargandoFlujos() {
  return <EsqueletoFormulario bloques={2} campos={4} />
}
