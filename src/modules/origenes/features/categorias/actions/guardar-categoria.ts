'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCategorias } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaGuardarCategoria } from '../schemas/categorias'

// El nombre y activar o desactivar. Una con subcategorías activas no se desactiva.
export const guardarCategoria = actionClient
  .inputSchema(esquemaGuardarCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioCategorias.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
