// Los huecos del panel de la unidad del área `documentos` de `logistica` (6.01, llenado por 6.06): el bloque «Documentos» y, para la pestaña de la ficha, el mismo componente. Sólo
// `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import { HuecoDeDocumentosDiferido } from '../features/documentos/components/diferidos'

// El panel de la unidad ya exige `logistica.ver` del origen; no hay una regla de flujo «documentos» (`CLAVES_DE_REGLAS` no la trae), así que `regla: null` (D3).
export const HUECOS_DE_DOCUMENTOS_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'documentos',
    titulo: 'Documentos',
    permisos: ['logistica.ver'],
    regla: null,
    repuesto: { permisos: ['repuestos.ver'], regla: null },
    componente: HuecoDeDocumentosDiferido,
  },
]

// Para la pestaña «Documentos» de la ficha del vehículo: el mismo componente, sin el bloque del panel (D2).
export { HuecoDeDocumentosDiferido as DocumentosDeLaUnidad }
