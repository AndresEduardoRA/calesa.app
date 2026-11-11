// Composición del área `documentos` de `flujos` en el servidor (5.02, la llena el 5.09): une las interfaces de `entities/documentos/` con su
// implementación de `infra/documentos/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  LectorDeTiposDeDocumento,
  LectorDeUsoDeTipos,
  RepositorioDeTiposDeDocumento,
} from '../../entities/documentos/repositorios'
import { tiposDeDocumentoSupabase } from '../../infra/documentos/escribir-tipos'
import { leerTiposDeDocumentoDelGrupo, leerUsoDeTiposDelGrupo } from '../../infra/documentos/tipos'

// Un grupo de tipos (los de toda la empresa o los de un flujo), con `tope + 1` leídos.
export const leerTiposDeDocumento: LectorDeTiposDeDocumento = leerTiposDeDocumentoDelGrupo

// Cuánto usa cada tipo del grupo; sólo para quien puede cambiarlo.
export const leerUsoDeTiposDeDocumento: LectorDeUsoDeTipos = leerUsoDeTiposDelGrupo

export const repositorioDeTiposDeDocumento: RepositorioDeTiposDeDocumento = tiposDeDocumentoSupabase
