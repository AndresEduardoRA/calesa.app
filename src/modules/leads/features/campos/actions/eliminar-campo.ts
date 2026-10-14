'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCamposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { esquemaEliminarCampo } from '../schemas/campos'

// Sólo un campo propio que ningún lead usa. Con datos, la base lo rechaza y se desactiva.
export const eliminarCampo = actionClient
  .inputSchema(esquemaEliminarCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = await repositorioCamposDeLead.eliminar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
