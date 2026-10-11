'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEquipo } from '../../../composicion'
import { esquemaBloquear } from '../schemas/equipo'

// Bloquear o desbloquear una cuenta. Bloquear no toca datos: la persona deja de poder operar.
export const bloquear = actionClient
  .inputSchema(esquemaBloquear)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para gestionar a las personas del equipo.')
    }
    const resultado = await repositorioEquipo.bloquear(parsedInput)
    // También si falló: un conflicto significa que la lista quedó vieja.
    revalidatePath(RUTAS.equipo)
    return resultado
  })
