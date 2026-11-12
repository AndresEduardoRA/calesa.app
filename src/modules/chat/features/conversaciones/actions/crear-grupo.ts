'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConversaciones } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeGrupo } from '../../../entities/grupos'

// Crea un grupo; el id es el del intento (repetirlo no duplica).
export const crearGrupo = actionClient
  .inputSchema(esquemaDeGrupo)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    const resultado = comoResultado(await repositorioDeConversaciones.crearGrupo(parsedInput))
    if (resultado.ok) {
      revalidatePath('/chat')
    }
    return resultado
  })
