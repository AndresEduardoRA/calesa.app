'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaGuardarCampo } from '../schemas/campos'

// Las banderas, el grupo, las opciones, el tipo y activar o desactivar. La base rechaza lo que
// toca datos ya cargados (cambiar el tipo de un campo con valores); `vistaPreviaDeCampo` lo
// cuenta antes para que la pantalla lo diga.
export const guardarCampo = actionClient
  .inputSchema(esquemaGuardarCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const guardado = await repositorioCampos.guardar(parsedInput)
    if (guardado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return guardado
  })
