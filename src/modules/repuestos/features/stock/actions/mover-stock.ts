'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeStock } from '../../../areas/stock/composicion'
import { SIN_PERMISO_PARA_MOVER_STOCK } from '../../../entities/stock/errores'
import type { RespuestaDeMover } from '../../../entities/stock/mover'
import { esquemaMoverStock } from '../schemas/stock'

// Pasa unidades de un ítem al stock o las saca (8.10-2, C8). Sin `repuestos.editar` no llega a la base; la RPC lo vuelve a exigir. No revalida rutas (D8): quien llama
// aplica la respuesta a su fila, como `guardarCelda`.
export const moverStock = actionClient
  .inputSchema(esquemaMoverStock)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeMover>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_MOVER_STOCK)
    }
    return repositorioDeStock.mover(parsedInput)
  })
