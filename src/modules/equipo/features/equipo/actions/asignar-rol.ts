'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEquipo } from '../../../composicion'
import { esquemaRolDePersona } from '../schemas/equipo'

// Darle un rol a una persona. La dominancia (nadie asigna un rol con permisos que no tiene) la
// decide la RPC, con la sesión de quien lo asigna.
export const asignarRol = actionClient
  .inputSchema(esquemaRolDePersona)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para gestionar a las personas del equipo.')
    }
    const resultado = await repositorioEquipo.asignarRol({
      ...parsedInput,
      principal: parsedInput.principal ?? false,
    })
    // También si falló: un conflicto significa que la lista quedó vieja.
    revalidatePath(RUTAS.equipo)
    return resultado
  })
