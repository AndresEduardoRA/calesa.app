'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTareas } from '../../../composicion'
import type { ResultadoDeEscritura } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaCompletarTarea } from '../schemas/tareas'

// Completa o reabre una tarea (su creador o su responsable lo decide la base; poner, no alternar).
export const completarTarea = actionClient
  .inputSchema(esquemaCompletarTarea)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    const resultado = comoResultado(await repositorioDeTareas.completar(parsedInput))
    if (resultado.ok) {
      revalidatePath('/agenda')
    }
    return resultado
  })
