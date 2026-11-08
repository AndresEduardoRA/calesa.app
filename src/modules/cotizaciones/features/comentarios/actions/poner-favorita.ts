'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../areas/comentarios/composicion'
import { esquemaPonerFavorita } from '../schemas/marcas'

// Marca o desmarca la cotización como favorita de quien mira (4.27-4): una marca privada; la pide ver (la base). Sin `revalidatePath`: nadie más la ve.
export const ponerFavorita = actionClient
  .inputSchema(esquemaPonerFavorita)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ valor: boolean }>> => {
    return repositorioDeMarcas.ponerFavorita(parsedInput)
  })
