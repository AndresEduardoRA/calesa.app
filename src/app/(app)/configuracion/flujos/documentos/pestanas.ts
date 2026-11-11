import type { PestanaDeFlujos } from '../pestanas'

// Las pestañas del área `documentos` de `flujos` (5.09): «Documentos», los tipos de documento de la empresa y del flujo. La ven quien configura un flujo
// (`flujos.configurar` o `repuestos.configurar`) y quien gestiona los catálogos de logística (`logistica.catalogos.gestionar`, que cambia los de toda la empresa).
export const PESTANAS_DE_DOCUMENTOS: readonly PestanaDeFlujos[] = [
  {
    clave: 'documentos',
    titulo: 'Documentos',
    permisos: ['flujos.configurar', 'repuestos.configurar', 'logistica.catalogos.gestionar'],
  },
]
