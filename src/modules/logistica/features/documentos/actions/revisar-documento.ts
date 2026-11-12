'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRevision } from '../../../areas/documentos/composicion'
import type { DocumentoModificado } from '../../../entities/documentos/repositorio-de-revision'
import { esquemaRevisarDocumento } from '../schemas/revision'

// Aprueba o rechaza un documento con la versión que se tenía en pantalla (6.06-3). Rechazar pide el motivo. Lo admite quien tiene `…documentos.aprobar` de la unidad (la base). Sin
// `revalidatePath`: el hueco relee su lista.
export const revisarDocumento = actionClient
  .inputSchema(esquemaRevisarDocumento)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DocumentoModificado>> => {
    return repositorioDeRevision.revisar(parsedInput)
  })
