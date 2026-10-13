'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioOrigenes } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaEliminarOrigen } from '../schemas/origenes'

// Sólo un origen sin uso: sin vehículos, cotizaciones ni fórmula publicada. Con uso la RPC lo
// rechaza diciendo qué lo ata; lo que se hace entonces es desactivarlo.
export const eliminarOrigen = actionClient
  .inputSchema(esquemaEliminarOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const eliminado = await repositorioOrigenes.eliminar(parsedInput)
    if (eliminado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
      revalidatePath(RUTAS.roles)
    }
    return eliminado
  })
