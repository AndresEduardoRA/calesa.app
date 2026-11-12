'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRevision } from '../../../areas/documentos/composicion'
import type { DocumentoModificado } from '../../../entities/documentos/repositorio-de-revision'
import { esquemaEliminarDocumento } from '../schemas/revision'

// Elimina un documento (borrado suave, sin restaurar) con la versión que se tenía en pantalla (6.06-3). Si una fase lo exige para salir, la base lo rechaza y se dice tal cual.
export const eliminarDocumento = actionClient
  .inputSchema(esquemaEliminarDocumento)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DocumentoModificado>> => {
    return repositorioDeRevision.eliminar(parsedInput)
  })
