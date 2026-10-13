'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaEliminarCampo } from '../schemas/campos'

// Sólo un campo propio que ningún vehículo usa. Con datos, la base lo rechaza y se desactiva.
export const eliminarCampo = actionClient
  .inputSchema(esquemaEliminarCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const eliminado = await repositorioCampos.eliminar(parsedInput)
    if (eliminado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return eliminado
  })
