// Composición de el área `documentos` de `logistica` en el servidor (6.01, llenada en 6.06-2): une el registro de documentos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeDocumentos } from '../../entities/documentos/repositorio-de-documentos'
import { documentosSupabase } from '../../infra/documentos/registrar'

// Registrar un archivo ya subido para una o varias unidades (6.06-2). Las actions de `features/documentos/` lo usan.
export const repositorioDeDocumentos: RepositorioDeDocumentos = documentosSupabase
