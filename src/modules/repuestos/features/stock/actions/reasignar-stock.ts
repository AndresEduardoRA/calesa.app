'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeStock } from '../../../areas/stock/composicion'
import { SIN_PERMISO_PARA_MOVER_STOCK } from '../../../entities/stock/errores'
import type { RespuestaDeReasignar } from '../../../entities/stock/reasignar'
import { esquemaReasignarStock } from '../schemas/stock'

// Reasigna unidades del stock de un ítem a otro proyecto (8.10-3, C4): todo o nada en la base. Sin `repuestos.editar` no llega a la base; la RPC lo vuelve a exigir. No
// revalida rutas (D10): quien llama relee su página con `router.refresh()`.
export const reasignarStock = actionClient
  .inputSchema(esquemaReasignarStock)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeReasignar>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_MOVER_STOCK)
    }
    return repositorioDeStock.reasignar(parsedInput)
  })
