'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTareas } from '../../../composicion'
import type { ResultadoDeEscritura } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaReasignarTarea } from '../schemas/tareas'

// Cambia de responsable a una tarea (su creador, con `agenda.tareas.asignar`: lo exige la base).
export const reasignarTarea = actionClient
  .inputSchema(esquemaReasignarTarea)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    const resultado = comoResultado(await repositorioDeTareas.reasignar(parsedInput))
    if (resultado.ok) {
      revalidatePath('/agenda')
    }
    return resultado
  })
