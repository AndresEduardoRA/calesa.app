'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaMoverCampo } from '../schemas/campos'

// «Ponlo después de X»: relativo, no por posición, así que sigue bien aunque alguien haya
// agregado un campo mientras tanto.
export const moverCampo = actionClient
  .inputSchema(esquemaMoverCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const movido = await repositorioCampos.mover(parsedInput)
    if (movido.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return movido
  })
