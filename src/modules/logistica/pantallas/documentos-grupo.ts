// Los huecos del resumen de un grupo del área `documentos` de `logistica` (6.01, llenado en 6.06-3): «Subir un documento a las unidades». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDelGrupo } from '../entities/nucleo/grupo'
import { HuecoDeDocumentosDelGrupoDiferido } from '../features/documentos/components/diferidos'

export const HUECOS_DE_DOCUMENTOS_EN_EL_GRUPO: readonly HuecoDelGrupo[] = [
  {
    clave: 'documentos',
    titulo: 'Subir un documento a las unidades',
    // Sin la clave de subir el bloque no se dibuja. La base la pide por cada unidad.
    permisos: ['logistica.documentos.subir'],
    // No hay regla de flujo «documentos» (V6 de 6.06-1).
    regla: null,
    componente: HuecoDeDocumentosDelGrupoDiferido,
  },
]
