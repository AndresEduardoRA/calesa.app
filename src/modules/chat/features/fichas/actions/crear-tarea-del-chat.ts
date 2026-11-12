'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFichas } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeTareaDelChat } from '../schemas/fichas'

// Crea la tarea y su ficha en el hilo. Sin `revalidatePath('/agenda')`: la agenda se lee al entrar y el hilo se entera por Realtime.
export const crearTareaDelChat = actionClient
  .inputSchema(esquemaDeTareaDelChat)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> =>
    comoResultado(await repositorioDeFichas.crearTarea(parsedInput)),
  )
