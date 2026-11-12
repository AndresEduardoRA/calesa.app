'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirGuias } from '../../../../areas/contenido/composicion'
import { MOTIVO_SIN_PERMISO_PARA_GUIAS } from '../../../../entities/contenido/guias'
import { esquemaCrearGuia } from '../schemas/guia'

// «Nueva guía»: crea el borrador (título y dirección, sin cuerpo) y devuelve su id para ir a su página. La base repite el permiso.
export const crearGuia = actionClient
  .inputSchema(esquemaCrearGuia)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_GUIAS)
    }
    const creada = await escribirGuias.crear(parsedInput)
    if (creada.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return creada
  })
