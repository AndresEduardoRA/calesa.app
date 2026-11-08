'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAdjuntos } from '../../../areas/comentarios/composicion'
import { esquemaQuitarAdjunto } from '../schemas/adjuntos'

// Quita un adjunto (4.27-3): quien lo subió, si todavía puede adjuntar, o quien modera (la base). El archivo queda 24 h en storage y lo barre la limpieza si nadie
// más lo usa. Sin `revalidatePath`: la sección lleva su propia lista.
export const quitarAdjunto = actionClient
  .inputSchema(esquemaQuitarAdjunto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ resultado: 'quitado' }>> => {
    return repositorioDeAdjuntos.quitar(parsedInput)
  })
