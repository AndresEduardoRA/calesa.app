'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCamposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { esquemaVistaPreviaDeCampo } from '../schemas/campos'

// Cuenta cuántos leads tienen valor en un campo, para avisar antes de un cambio que los toque. Son
// agregados: nunca un valor. No escribe nada.
export const vistaPreviaDeCampo = actionClient
  .inputSchema(esquemaVistaPreviaDeCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    return repositorioCamposDeLead.impacto(parsedInput.id)
  })
