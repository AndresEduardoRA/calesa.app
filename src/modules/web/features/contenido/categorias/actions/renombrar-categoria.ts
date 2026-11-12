'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategorias } from '../../../../areas/contenido/composicion'
import { MOTIVO_SIN_PERMISO_PARA_CATEGORIAS } from '../../../../entities/contenido/categorias'
import { esquemaRenombrarCategoria } from '../schemas/categoria'

// Cambia el nombre; la dirección no se mueve. La base repite el permiso.
export const renombrarCategoria = actionClient
  .inputSchema(esquemaRenombrarCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_CATEGORIAS)
    }
    const hecho = await escribirCategorias.renombrar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return hecho
  })
