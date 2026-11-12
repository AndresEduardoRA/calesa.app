'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeItems } from '../../../areas/items/composicion'
import { SIN_PERMISO_PARA_EDITAR_ITEMS } from '../../../entities/items/errores'
import { esquemaEliminarItem } from '../schemas/item'

// Elimina un ítem sin uso (8.09-2, C11). El permiso se mira antes de escribir; la base rechaza el que ya tiene historial, documentos, compras, gastos o stock con el motivo (`en_uso`) y exige la
// versión que se vio (`PT409`). Como la base lo hace, no hay deshacer: el diálogo lo dice.
export const eliminarItem = actionClient
  .inputSchema(esquemaEliminarItem)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ id: string }>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EDITAR_ITEMS)
    }
    return repositorioDeItems.eliminar(parsedInput)
  })
