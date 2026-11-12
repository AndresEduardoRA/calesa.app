'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeDocumentos } from '../../../areas/documentos/composicion'
import type { DocumentoRegistrado } from '../../../entities/documentos/repositorio-de-documentos'
import { esquemaRegistrarDocumentos } from '../schemas/registrar'

// Registra un archivo que el navegador ya subió al bucket (6.06-2). El id lo trae el cliente: un reintento no duplica. Lo admite quien tiene `logistica.documentos.subir` en cada
// unidad (la base). Sin `revalidatePath`: el hueco relee su lista.
export const registrarDocumentos = actionClient
  .inputSchema(esquemaRegistrarDocumentos)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DocumentoRegistrado[]>> => {
    return repositorioDeDocumentos.registrar(parsedInput)
  })
