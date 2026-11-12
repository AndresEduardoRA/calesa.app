import type { ClavesDeDocumentos } from '../../../entities/documentos/revision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'

// Lo que el hueco le pasa a cada fila de documento para que ofrezca sus acciones (6.06-3): la unidad (para avisar que cambió algo), los permisos de quien mira, los tipos (el portal
// depende del tipo) y cómo volver a leer la lista.
export type ContextoDeLaFila = {
  unidadId: string
  claves: ClavesDeDocumentos
  tipos: readonly TipoDeDocumento[]
  releer: () => void
}
