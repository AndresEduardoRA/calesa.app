'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTareas } from '../../../composicion'
import type { ResultadoDeEscritura } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaEliminarTarea } from '../schemas/tareas'

// Elimina una tarea (sólo quien la creó).
export const eliminarTarea = actionClient
  .inputSchema(esquemaEliminarTarea)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    const resultado = comoResultado(await repositorioDeTareas.eliminar(parsedInput))
    if (resultado.ok) {
      revalidatePath('/agenda')
    }
    return resultado
  })
