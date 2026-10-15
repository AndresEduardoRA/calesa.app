'use server'

import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTelefonos } from '../../../composicion'
import type { Verificacion } from '../../../entities/verificacion'
import { esquemaVerificarTelefonoDeLead } from '../schemas/telefonos'

// «¿Ya existe este teléfono, y de quién es?» al cambiar el principal de un lead: como en el alta,
// pero sin contar al propio lead y sólo para quien lo tiene en su cartera (la base lo exige).
export const verificarTelefonoDeLead = actionClient
  .inputSchema(esquemaVerificarTelefonoDeLead)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<Verificacion>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar leads.')
    }
    return repositorioDeTelefonos.verificar(parsedInput)
  })
