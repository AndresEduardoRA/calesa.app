'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConversaciones } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'

// Entra al canal del equipo; la base exige `chat.global`.
export const entrarAlGlobal = actionClient.action(
  async (): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    const resultado = comoResultado(await repositorioDeConversaciones.entrarAlGlobal())
    if (resultado.ok) {
      revalidatePath('/chat')
    }
    return resultado
  },
)
