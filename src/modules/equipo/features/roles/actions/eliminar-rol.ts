'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioRoles } from '../../../composicion'
import { esquemaEliminarRol } from '../schemas/roles'

export const eliminarRol = actionClient
  .inputSchema(esquemaEliminarRol)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para eliminar roles.')
    }
    const eliminado = await repositorioRoles.eliminar(parsedInput)
    // También si falló: un conflicto significa que la pantalla quedó vieja.
    revalidatePath(RUTAS.roles)
    return eliminado
  })
