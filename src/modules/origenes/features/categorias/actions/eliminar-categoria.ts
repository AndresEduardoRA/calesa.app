'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCategorias } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaEliminarCategoria } from '../schemas/categorias'

// Sólo una sin subcategorías ni vehículos. Con vehículos se desactiva para conservarlos agrupados.
export const eliminarCategoria = actionClient
  .inputSchema(esquemaEliminarCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioCategorias.eliminar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
