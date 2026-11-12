'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import { esquemaEliminarCategoria } from '../schemas/categoria'

// Elimina una categoría de gasto (6.11-4). Una con gastos no se borra: la base responde 23503 y se dice que se desactive.
export const eliminarCategoria = actionClient
  .inputSchema(esquemaEliminarCategoria)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string }>> => {
    return repositorioDeCategorias.eliminar(parsedInput)
  })
