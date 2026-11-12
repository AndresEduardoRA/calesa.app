'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConversaciones } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeConversacion } from '../schemas/conversaciones'

// Dejar un grupo o el canal del equipo; una directa no se deja (la base lo dice).
export const salirDeLaConversacion = actionClient
  .inputSchema(esquemaDeConversacion)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    const resultado = comoResultado(
      await repositorioDeConversaciones.salir(parsedInput.conversacion),
    )
    if (resultado.ok) {
      revalidatePath('/chat')
    }
    return resultado
  })
