// Composición de el área `documentos` de `logistica` en el servidor (6.01, llenada en 6.06-2 y 6.06-3): une el registro y la revisión de documentos con sus interfaces. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeDocumentos } from '../../entities/documentos/repositorio-de-documentos'
import type { RepositorioDeRevision } from '../../entities/documentos/repositorio-de-revision'
import { revisionSupabase } from '../../infra/documentos/modificar'
import { documentosSupabase } from '../../infra/documentos/registrar'

// Registrar un archivo ya subido para una o varias unidades (6.06-2). Las actions de `features/documentos/` lo usan.
export const repositorioDeDocumentos: RepositorioDeDocumentos = documentosSupabase

// Aprobar, rechazar, editar y eliminar un documento (6.06-3).
export const repositorioDeRevision: RepositorioDeRevision = revisionSupabase
