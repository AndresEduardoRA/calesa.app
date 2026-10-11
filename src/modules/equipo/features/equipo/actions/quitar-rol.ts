'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEquipo } from '../../../composicion'
import { esquemaRolDePersona } from '../schemas/equipo'

// Quitarle un rol a una persona. Si era la última que administra, el guardián de la base lo impide
// y su motivo llega tal cual a la pantalla.
export const quitarRol = actionClient
  .inputSchema(esquemaRolDePersona)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para gestionar a las personas del equipo.')
    }
    const resultado = await repositorioEquipo.quitarRol(parsedInput)
    // También si falló: un conflicto significa que la lista quedó vieja.
    revalidatePath(RUTAS.equipo)
    return resultado
  })
