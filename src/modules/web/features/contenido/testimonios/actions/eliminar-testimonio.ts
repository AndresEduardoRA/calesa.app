'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTestimonios } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_TESTIMONIOS } from '../../../../entities/contenido/errores'
import { esquemaEliminarTestimonio } from '../schemas/testimonio'

// Elimina un testimonio con la versión que se vio (8.02-2). Deja de verse en la web pública en cuanto el trigger de revalidación avisa al sitio.
export const eliminarTestimonio = actionClient
  .inputSchema(esquemaEliminarTestimonio)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ id: string }>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_TESTIMONIOS)
    }
    const hecho = await repositorioDeTestimonios.eliminar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
