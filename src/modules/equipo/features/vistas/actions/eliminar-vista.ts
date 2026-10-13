'use server'

import { revalidatePath } from 'next/cache'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioVistas } from '../../../composicion'
import { RUTA_DE_PANTALLA } from '../../../entities/vista'
import { esquemaEliminarVista } from '../schemas/vistas'

export const eliminarVista = actionClient
  .inputSchema(esquemaEliminarVista)
  .action(async ({ parsedInput, ctx }) => {
    const eliminada = await repositorioVistas.eliminar({
      id: parsedInput.id,
      usuarioId: ctx.usuarioId,
    })
    if (eliminada.ok) {
      revalidatePath(RUTA_DE_PANTALLA[parsedInput.pantalla])
    }
    return eliminada
  })
