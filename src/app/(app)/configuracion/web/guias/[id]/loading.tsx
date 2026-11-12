import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas.
export default function CargandoUnaGuia() {
  return <EsqueletoFormulario bloques={3} campos={4} />
}
