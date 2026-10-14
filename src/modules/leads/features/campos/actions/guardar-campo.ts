'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCamposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { esquemaGuardarCampo } from '../schemas/campos'

// Las banderas, el grupo, las opciones, el tipo y activar o desactivar. La base rechaza lo que toca datos ya cargados (cambiar el tipo de un campo con valores); `vistaPreviaDeCampo` lo cuenta antes.
export const guardarCampo = actionClient
  .inputSchema(esquemaGuardarCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = await repositorioCamposDeLead.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
