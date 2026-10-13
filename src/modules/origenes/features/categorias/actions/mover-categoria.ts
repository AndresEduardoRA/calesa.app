'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCategorias } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaMoverCategoria } from '../schemas/categorias'

// «Ponla después de X» entre sus hermanas (el mismo padre); nula = primera.
export const moverCategoria = actionClient
  .inputSchema(esquemaMoverCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioCategorias.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
