'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioRoles } from '../../../composicion'
import { esquemaRevocar } from '../schemas/roles'

// Quitarle a un rol un permiso en un origen (o el de todos los orígenes).
export const revocar = actionClient
  .inputSchema(esquemaRevocar)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para cambiar los permisos de un rol.')
    }
    const revocado = await repositorioRoles.revocar(parsedInput)
    if (revocado.ok) {
      revalidatePath(RUTAS.roles)
    }
    return revocado
  })
