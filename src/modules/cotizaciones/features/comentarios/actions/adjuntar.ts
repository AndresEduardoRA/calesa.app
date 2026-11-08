'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAdjuntos } from '../../../areas/comentarios/composicion'
import type { Adjunto } from '../../../entities/comentarios/adjunto'
import { esquemaAdjuntar } from '../schemas/adjuntos'

// Registra como adjunto de la cotización un archivo que el navegador ya subió (4.27-3). Lo admite quien puede guardarla (la base). Sin `revalidatePath`: la sección
// lleva su propia lista.
export const adjuntar = actionClient
  .inputSchema(esquemaAdjuntar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Adjunto>> => {
    return repositorioDeAdjuntos.adjuntar(parsedInput)
  })
