'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirGuias } from '../../../../areas/contenido/composicion'
import { MOTIVO_SIN_PERMISO_PARA_GUIAS } from '../../../../entities/contenido/guias'
import { esquemaEliminarGuia } from '../schemas/guia'

// Elimina la guía (con la versión esperada). La base repite el permiso; si estaba publicada, sale de la web al revalidar.
export const eliminarGuia = actionClient
  .inputSchema(esquemaEliminarGuia)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_GUIAS)
    }
    const eliminada = await escribirGuias.eliminar(parsedInput)
    if (eliminada.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return eliminada
  })
