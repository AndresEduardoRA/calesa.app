'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaVistaPreviaDeCampo } from '../schemas/campos'

// Cuenta cuántos vehículos tienen valor en un campo, para avisar antes de un cambio que los toque.
// No escribe nada.
export const vistaPreviaDeCampo = actionClient
  .inputSchema(esquemaVistaPreviaDeCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    return repositorioCampos.impacto(parsedInput.id)
  })
