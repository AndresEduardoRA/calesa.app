'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGastos } from '../../../areas/dinero/composicion'
import { esquemaEliminarGasto } from '../schemas/gasto'

// Elimina un gasto (borrado suave) con la versión que se tenía en pantalla (6.11-1). La base no deja quitar el último gasto de tributos que la fase actual exige.
export const eliminarGasto = actionClient
  .inputSchema(esquemaEliminarGasto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string }>> => {
    return repositorioDeGastos.eliminar(parsedInput)
  })
