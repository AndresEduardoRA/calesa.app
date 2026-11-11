'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTareas } from '../../../composicion'
import type { ResultadoDeEscritura } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaGuardarTarea } from '../schemas/tareas'

// Guarda lo que cambió de una tarea (sólo su creador); el responsable no cambia aquí.
export const guardarTarea = actionClient
  .inputSchema(esquemaGuardarTarea)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    const resultado = comoResultado(await repositorioDeTareas.guardar(parsedInput))
    if (resultado.ok) {
      revalidatePath('/agenda')
    }
    return resultado
  })
