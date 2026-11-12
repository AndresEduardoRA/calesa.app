'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRevision } from '../../../areas/documentos/composicion'
import type { DocumentoModificado } from '../../../entities/documentos/repositorio-de-revision'
import { esquemaEditarDocumento } from '../schemas/revision'

// Cambia las fechas, la nota o «Visible en el portal» de un documento, sólo lo que cambió (6.06-3). El portal lo decide quien aprueba; lo demás, quien aprueba o quien subió el archivo
// mientras siga «Subido»: lo dice la base.
export const editarDocumento = actionClient
  .inputSchema(esquemaEditarDocumento)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DocumentoModificado>> => {
    return repositorioDeRevision.editar(parsedInput)
  })
