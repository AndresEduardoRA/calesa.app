'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConversaciones } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeUsuario } from '../schemas/conversaciones'

// Abre la directa con una persona (la que ya existe se devuelve, no se duplica); la base exige quién puede conversar.
export const abrirDirecta = actionClient
  .inputSchema(esquemaDeUsuario)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    const resultado = comoResultado(
      await repositorioDeConversaciones.abrirDirecta(parsedInput.usuario),
    )
    if (resultado.ok) {
      revalidatePath('/chat')
    }
    return resultado
  })
