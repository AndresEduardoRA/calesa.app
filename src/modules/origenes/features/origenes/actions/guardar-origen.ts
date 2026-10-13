'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioOrigenes } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaGuardarOrigen } from '../schemas/origenes'

// Nombre, sustantivo, género, color, plataformas y activo. El tipo y la clave no se editan: la
// RPC y un trigger lo impiden aunque alguien lo intente por otro camino.
export const guardarOrigen = actionClient
  .inputSchema(esquemaGuardarOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const { plataformas, ...resto } = parsedInput
    const guardado = await repositorioOrigenes.guardar({
      ...resto,
      ...(plataformas === undefined ? {} : { apibaraPlataformas: plataformas }),
    })
    if (guardado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
      revalidatePath(RUTAS.roles)
    }
    return guardado
  })
