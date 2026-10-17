'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEquipo } from '../../../composicion'
import { esquemaPersona } from '../schemas/equipo'

// Dar de baja: la persona sale del equipo y sus leads van al limbo (por lotes si son muchos). Devuelve si terminó y
// cuántos fueron hasta ahí.
export const darDeBaja = actionClient
  .inputSchema(esquemaPersona)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para gestionar a las personas del equipo.')
    }
    const resultado = await repositorioEquipo.darDeBaja(parsedInput.personaId)
    // También si falló: un conflicto significa que la lista quedó vieja.
    revalidatePath(RUTAS.equipo)
    return resultado
  })
