'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategorias } from '../../../../areas/contenido/composicion'
import { MOTIVO_SIN_PERMISO_PARA_CATEGORIAS } from '../../../../entities/contenido/categorias'
import { esquemaMoverCategoria } from '../schemas/categoria'

// Sube o baja una posición (reescribe el orden de todas). La base repite el permiso.
export const moverCategoria = actionClient
  .inputSchema(esquemaMoverCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_CATEGORIAS)
    }
    const hecho = await escribirCategorias.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return hecho
  })
