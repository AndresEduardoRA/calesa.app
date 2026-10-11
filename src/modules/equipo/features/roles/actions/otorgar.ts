'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioRoles } from '../../../composicion'
import { esquemaOtorgar } from '../schemas/roles'

// Darle a un rol un permiso, en un origen (o en todos) y con un alcance. Si ya lo tenía ahí,
// cambia el alcance. La dominancia (nadie da lo que no tiene) la decide la RPC.
export const otorgar = actionClient
  .inputSchema(esquemaOtorgar)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para cambiar los permisos de un rol.')
    }
    const otorgado = await repositorioRoles.otorgar(parsedInput)
    if (otorgado.ok) {
      revalidatePath(RUTAS.roles)
    }
    return otorgado
  })
