'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConversaciones } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeSilencio } from '../schemas/conversaciones'

// Silenciar o dejar de silenciar (poner, no alternar).
export const silenciarConversacion = actionClient
  .inputSchema(esquemaDeSilencio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    const resultado = comoResultado(await repositorioDeConversaciones.silenciar(parsedInput))
    if (resultado.ok) {
      revalidatePath('/chat')
    }
    return resultado
  })
