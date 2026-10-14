'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCamposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { esquemaMoverCampo } from '../schemas/campos'

// «Ponlo después de X»: relativo, no por posición, así que sigue bien aunque alguien haya agregado un campo mientras tanto.
export const moverCampo = actionClient
  .inputSchema(esquemaMoverCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = await repositorioCamposDeLead.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
